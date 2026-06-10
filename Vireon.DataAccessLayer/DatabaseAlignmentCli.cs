using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Vireon.DataAccessLayer.Concrete.EntityFramework;

namespace Vireon.DataAccessLayer;

/// <summary>
/// Komut satırı: dotnet run -- --align-database
/// </summary>
public static class DatabaseAlignmentCli
{
    public static int Run(string contentRootPath)
    {
        using var loggerFactory = LoggerFactory.Create(b => b.AddConsole().SetMinimumLevel(LogLevel.Information));
        var logger = loggerFactory.CreateLogger("DatabaseAlignment");

        var configuration = new ConfigurationBuilder()
            .SetBasePath(contentRootPath)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var rawConnection = configuration.GetConnectionString("VireonDB") ?? "Data Source=../Database/vireon_local.db";
        var csb = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(rawConnection);
        if (!string.IsNullOrWhiteSpace(csb.DataSource) && !Path.IsPathRooted(csb.DataSource))
            csb.DataSource = SqlitePathResolver.ResolveSharedDbPath(contentRootPath, csb.DataSource);

        logger.LogInformation("Hedef veritabanı: {DbPath}", csb.DataSource);

        var options = new DbContextOptionsBuilder<VireonContext>()
            .UseSqlite(csb.ConnectionString)
            .Options;

        using var context = new VireonContext(options);

        DatabaseSchemaAlignment.EnsureAligned(context, logger);

        if (!DatabaseSchemaAlignment.ValidateSchema(context, logger, out _))
            return 2;

        DatabaseSchemaAlignment.LogTableCounts(context, logger);
        logger.LogInformation("OK: Veritabanı entity modelleri ile uyumlu.");
        return 0;
    }
}
