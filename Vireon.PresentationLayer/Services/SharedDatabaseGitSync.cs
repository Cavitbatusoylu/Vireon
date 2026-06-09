using System.Diagnostics;
using Microsoft.Extensions.Options;

namespace Vireon.PresentationLayer.Services;

public sealed class SharedDatabaseGitSyncOptions
{
    public bool AutoGitSync { get; set; } = true;
    public bool PullOnStartup { get; set; } = true;
    public string GitBranch { get; set; } = "Cavit-login";
    public int PushDelaySeconds { get; set; } = 8;
}

/// <summary>
/// Paylaşımlı SQLite dosyasını GitHub ile senkronlar:
/// açılışta uzaktaki DB çekilir, yerel değişiklikten sonra otomatik push yapılır.
/// </summary>
public sealed class SharedDatabaseGitSync : IHostedService, IDisposable
{
    private readonly SharedDatabaseGitSyncOptions _options;
    private readonly ILogger<SharedDatabaseGitSync> _logger;
    private readonly string _contentRoot;
    private readonly string? _repoRoot;
    private readonly string _dbRelativePath = Path.Combine("Database", "vireon_local.db");
    private FileSystemWatcher? _watcher;
    private Timer? _pushTimer;
    private readonly object _gate = new();
    private bool _pushScheduled;
    private bool _startupQuiet;

    public SharedDatabaseGitSync(
        IWebHostEnvironment env,
        IOptions<SharedDatabaseGitSyncOptions> options,
        ILogger<SharedDatabaseGitSync> logger)
    {
        _contentRoot = env.ContentRootPath;
        _options = options.Value;
        _logger = logger;
        _repoRoot = FindGitRepoRoot(_contentRoot);
        _pushTimer = new Timer(_ => _ = PushIfPendingAsync(), null, Timeout.Infinite, Timeout.Infinite);
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.AutoGitSync || _repoRoot == null)
        {
            if (_repoRoot == null)
                _logger.LogDebug("Git repo bulunamadı — otomatik DB senkronu kapalı.");
            return Task.CompletedTask;
        }

        var dbPath = Path.Combine(_repoRoot, _dbRelativePath);
        var dbDir = Path.GetDirectoryName(dbPath);
        if (string.IsNullOrEmpty(dbDir) || !File.Exists(dbPath))
            return Task.CompletedTask;

        _watcher = new FileSystemWatcher(dbDir, "vireon_local.db")
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size | NotifyFilters.FileName
        };
        _watcher.Changed += OnDbChanged;
        _watcher.Created += OnDbChanged;
        _watcher.EnableRaisingEvents = true;

        _logger.LogInformation("🔄 Otomatik DB senkronu aktif (branch: {Branch})", _options.GitBranch);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _watcher?.Dispose();
        _watcher = null;
        _pushTimer?.Dispose();
        _pushTimer = null;
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _watcher?.Dispose();
        _pushTimer?.Dispose();
    }

    /// <summary>Uygulama açılmadan önce uzaktaki DB dosyasını çeker.</summary>
    public void PullOnStartupIfEnabled()
    {
        if (!_options.AutoGitSync || !_options.PullOnStartup || _repoRoot == null)
            return;

        _startupQuiet = true;
        try
        {
            _logger.LogInformation("⬇️ GitHub'dan güncel veritabanı çekiliyor ({Branch})...", _options.GitBranch);

            if (!RunGit(_repoRoot, $"fetch origin {_options.GitBranch}", out var fetchErr))
            {
                _logger.LogWarning("Git fetch başarısız (çevrimdışı olabilir): {Err}", fetchErr);
                return;
            }

            if (!RunGit(_repoRoot, $"checkout origin/{_options.GitBranch} -- {_dbRelativePath.Replace('\\', '/')}", out var checkoutErr))
            {
                _logger.LogWarning("DB checkout başarısız: {Err}", checkoutErr);
                return;
            }

            _logger.LogInformation("✅ Veritabanı GitHub ile senkronize edildi.");
        }
        finally
        {
            _startupQuiet = false;
        }
    }

    private void OnDbChanged(object sender, FileSystemEventArgs e)
    {
        if (_startupQuiet) return;
        SchedulePush();
    }

    public void SchedulePush()
    {
        if (!_options.AutoGitSync || _repoRoot == null) return;

        lock (_gate)
        {
            _pushScheduled = true;
        }

        _pushTimer?.Change(TimeSpan.FromSeconds(Math.Max(3, _options.PushDelaySeconds)), Timeout.InfiniteTimeSpan);
    }

    private async Task PushIfPendingAsync()
    {
        lock (_gate)
        {
            if (!_pushScheduled) return;
            _pushScheduled = false;
        }

        if (_repoRoot == null) return;

        await Task.Run(() =>
        {
            try
            {
                _logger.LogInformation("⬆️ Veritabanı değişti — GitHub'a gönderiliyor...");

                RunGit(_repoRoot, $"add {_dbRelativePath.Replace('\\', '/')}", out _);

                var diffExit = RunGitExitCode(_repoRoot, "diff --cached --quiet", out _);
                if (diffExit == 0)
                {
                    _logger.LogDebug("DB dosyasında commit edilecek değişiklik yok.");
                    return;
                }

                if (diffExit != 1)
                {
                    _logger.LogWarning("Git diff kontrolü başarısız.");
                    return;
                }

                var message = $"chore: auto-sync database ({DateTime.Now:yyyy-MM-dd HH:mm})";
                if (!RunGit(_repoRoot, $"commit -m \"{message}\"", out var commitErr))
                {
                    _logger.LogWarning("Git commit başarısız: {Err}", commitErr);
                    return;
                }

                if (!RunGit(_repoRoot, $"push origin {_options.GitBranch}", out var pushErr))
                {
                    _logger.LogWarning("Git push başarısız (önce git pull deneyin): {Err}", pushErr);
                    return;
                }

                _logger.LogInformation("✅ Veritabanı GitHub'a gönderildi.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Otomatik DB push sırasında hata.");
            }
        });
    }

    private static string? FindGitRepoRoot(string startPath)
    {
        var dir = new DirectoryInfo(startPath);
        for (var i = 0; dir != null && i < 10; i++, dir = dir.Parent)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, ".git")))
                return dir.FullName;
        }
        return null;
    }

    private static bool RunGit(string workingDirectory, string arguments, out string error)
    {
        var exit = RunGitExitCode(workingDirectory, arguments, out var combined);
        error = combined;
        return exit == 0;
    }

    private static int RunGitExitCode(string workingDirectory, string arguments, out string output)
    {
        output = string.Empty;
        try
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "git",
                    Arguments = arguments,
                    WorkingDirectory = workingDirectory,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            process.Start();
            var stdout = process.StandardOutput.ReadToEnd();
            var stderr = process.StandardError.ReadToEnd();
            process.WaitForExit(15000);
            output = string.IsNullOrWhiteSpace(stderr) ? stdout.Trim() : stderr.Trim();
            return process.ExitCode;
        }
        catch (Exception ex)
        {
            output = ex.Message;
            return -1;
        }
    }
}
