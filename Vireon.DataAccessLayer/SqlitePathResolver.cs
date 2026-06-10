namespace Vireon.DataAccessLayer;

/// <summary>
/// Paylaşımlı SQLite dosya yolunu çözümler (repo kökündeki Database/ klasörü).
/// </summary>
public static class SqlitePathResolver
{
    public static string ResolveSharedDbPath(string contentRootPath, string relativeDataSource)
    {
        var fileName = Path.GetFileName(relativeDataSource);
        if (string.IsNullOrWhiteSpace(fileName)) fileName = "vireon_local.db";

        var dir = new DirectoryInfo(contentRootPath);
        for (var depth = 0; dir != null && depth < 8; depth++, dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "Database");
            if (Directory.Exists(candidate))
                return Path.Combine(candidate, fileName);
        }

        var fallback = Path.GetFullPath(Path.Combine(contentRootPath, relativeDataSource));
        var fallbackDir = Path.GetDirectoryName(fallback);
        if (!string.IsNullOrEmpty(fallbackDir)) Directory.CreateDirectory(fallbackDir);
        return fallback;
    }
}
