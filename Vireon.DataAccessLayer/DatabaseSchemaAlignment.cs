using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.DataAccessLayer;

/// <summary>
/// Entity modelleri ile SQLite tablolarını eşitler; eksik sütunları tamamlar ve ilişkili veriyi hizalar.
/// </summary>
public static class DatabaseSchemaAlignment
{
    private static readonly IReadOnlyDictionary<string, string[]> ExpectedColumns = new Dictionary<string, string[]>
    {
        ["Users"] = ["Id", "Name", "Surname", "Email", "Password", "AccountNumber", "CreatedAt", "Role", "PlainPassword"],
        ["Accounts"] = ["Id", "UserId", "AccountNumber", "Balance", "Currency", "RowVersion"],
        ["Transactions"] = ["Id", "SenderAccountId", "ReceiverAccountId", "Amount", "Status", "Date", "CreatedAt", "Description"],
        ["DailyLimits"] = ["Id", "UserId", "MaxDailyLimit", "UsedLimit", "LastResetDate"],
        ["FraudLogs"] = ["Id", "AccountId", "RiskType", "Description", "LogDate"],
        ["LedgerEntries"] = ["Id", "AccountId", "Amount", "PreviousBalance", "NewBalance", "Description", "CreatedAt"],
    };

    private static readonly IReadOnlyDictionary<string, string> ColumnPatches = new Dictionary<string, string>
    {
        ["Users.Role"] = "ALTER TABLE Users ADD COLUMN Role TEXT NOT NULL DEFAULT 'User'",
        ["Users.PlainPassword"] = "ALTER TABLE Users ADD COLUMN PlainPassword TEXT NULL",
        ["Accounts.RowVersion"] = "ALTER TABLE Accounts ADD COLUMN RowVersion BLOB NULL",
    };

    private static readonly string[] ExpectedMigrations =
    [
        "20260419122318_InitialCreate",
        "20260510085037_AddRowVersion",
        "20260510095002_AddUserRole",
        "20260605143000_AddPlainPassword",
    ];

    public static void EnsureAligned(VireonContext context, ILogger logger)
    {
        context.Database.Migrate();
        EnsureCoreTables(context, logger);
        PatchMissingColumns(context, logger);
        AlignUserAccountRelations(context, logger);
    }

    /// <summary>Entity modeli ile SQLite şemasının uyumunu doğrular.</summary>
    public static bool ValidateSchema(VireonContext context, ILogger logger, out List<string> issues)
    {
        issues = [];

        var connection = context.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen) connection.Open();
        try
        {
            using var tablesCmd = connection.CreateCommand();
            tablesCmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table'";
            var existingTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var reader = tablesCmd.ExecuteReader())
            {
                while (reader.Read())
                    existingTables.Add(reader.GetString(0));
            }

            foreach (var table in ExpectedColumns.Keys)
            {
                if (!existingTables.Contains(table))
                    issues.Add($"Eksik tablo: {table}");
            }

            foreach (var (table, columns) in ExpectedColumns)
            {
                var actual = GetTableColumns(context, table);
                if (actual.Count == 0) continue;
                foreach (var col in columns)
                {
                    if (!actual.Contains(col))
                        issues.Add($"Eksik sütun: {table}.{col}");
                }
            }

            using var migCmd = connection.CreateCommand();
            migCmd.CommandText = "SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId";
            var applied = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var reader = migCmd.ExecuteReader())
            {
                while (reader.Read())
                    applied.Add(reader.GetString(0));
            }

            foreach (var migration in ExpectedMigrations)
            {
                if (!applied.Contains(migration))
                    issues.Add($"Eksik migration: {migration}");
            }
        }
        finally
        {
            if (!wasOpen) connection.Close();
        }

        if (issues.Count > 0)
        {
            foreach (var issue in issues)
                logger.LogError("Şema uyumsuzluğu: {Issue}", issue);
            return false;
        }

        logger.LogInformation("Şema doğrulaması OK — 6 tablo entity modelleri ile uyumlu.");
        return true;
    }

    public static void LogTableCounts(VireonContext context, ILogger logger)
    {
        logger.LogInformation("Users: {Count}", context.Users.Count());
        logger.LogInformation("Accounts: {Count}", context.Accounts.Count());
        logger.LogInformation("Transactions: {Count}", context.Transactions.Count());
        logger.LogInformation("DailyLimits: {Count}", context.DailyLimits.Count());
        logger.LogInformation("FraudLogs: {Count}", context.FraudLogs.Count());
        logger.LogInformation("LedgerEntries: {Count}", context.LedgerEntries.Count());
    }

    private static void EnsureCoreTables(VireonContext context, ILogger logger)
    {
        var connection = context.Database.GetDbConnection();
        connection.Open();
        try
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table'";
            var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                    existing.Add(reader.GetString(0));
            }

            foreach (var table in ExpectedColumns.Keys)
            {
                if (!existing.Contains(table))
                    logger.LogWarning("Beklenen tablo eksik (Migrate sonrası): {Table}", table);
            }
        }
        finally
        {
            connection.Close();
        }
    }

    private static void PatchMissingColumns(VireonContext context, ILogger logger)
    {
        foreach (var (table, columns) in ExpectedColumns)
        {
            var actual = GetTableColumns(context, table);
            if (actual.Count == 0) continue;

            foreach (var expected in columns)
            {
                if (actual.Contains(expected)) continue;

                var key = $"{table}.{expected}";
                if (ColumnPatches.TryGetValue(key, out var sql))
                {
                    context.Database.ExecuteSqlRaw(sql);
                    logger.LogInformation("Şema eşitlendi: {Table}.{Column} eklendi", table, expected);
                    continue;
                }

                logger.LogWarning("Eksik sütun için otomatik yama yok: {Table}.{Column}", table, expected);
            }
        }
    }

    private static HashSet<string> GetTableColumns(VireonContext context, string table)
    {
        var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var connection = context.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen) connection.Open();
        try
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = $"PRAGMA table_info([{table}])";
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
                columns.Add(reader.GetString(1));
        }
        finally
        {
            if (!wasOpen) connection.Close();
        }
        return columns;
    }

    private static void AlignUserAccountRelations(VireonContext context, ILogger logger)
    {
        var users = context.Users.ToList();
        var changed = false;

        foreach (var user in users)
        {
            if (string.IsNullOrWhiteSpace(user.AccountNumber))
            {
                user.AccountNumber = GenerateUniqueAccountNumber(context);
                changed = true;
                logger.LogInformation("Hesap numarası atandı: {Email} → {AccountNumber}", user.Email, user.AccountNumber);
            }

            if (user.CreatedAt == default)
            {
                user.CreatedAt = DateTime.Now;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(user.Role))
            {
                user.Role = "User";
                changed = true;
            }

            var account = context.Accounts.FirstOrDefault(a => a.UserId == user.Id);
            if (account == null)
            {
                context.Accounts.Add(new Account
                {
                    UserId = user.Id,
                    AccountNumber = user.AccountNumber,
                    Balance = 0m,
                    Currency = "TRY"
                });
                changed = true;
                logger.LogInformation("Eksik hesap oluşturuldu: {Email}", user.Email);
            }
            else if (!string.Equals(account.AccountNumber, user.AccountNumber, StringComparison.Ordinal))
            {
                account.AccountNumber = user.AccountNumber;
                changed = true;
                logger.LogInformation("Hesap numarası eşitlendi: {Email} → {AccountNumber}", user.Email, user.AccountNumber);
            }

            if (!context.DailyLimits.Any(d => d.UserId == user.Id))
            {
                context.DailyLimits.Add(new DailyLimit
                {
                    UserId = user.Id,
                    MaxDailyLimit = 50_000m,
                    UsedLimit = 0m,
                    LastResetDate = DateTime.Now.Date
                });
                changed = true;
                logger.LogInformation("Günlük limit oluşturuldu: {Email}", user.Email);
            }
        }

        var orphanAccounts = context.Accounts
            .Where(a => !context.Users.Any(u => u.Id == a.UserId))
            .ToList();

        foreach (var orphan in orphanAccounts)
        {
            context.LedgerEntries.RemoveRange(context.LedgerEntries.Where(l => l.AccountId == orphan.Id));
            context.FraudLogs.RemoveRange(context.FraudLogs.Where(f => f.AccountId == orphan.Id));
            context.Transactions.RemoveRange(
                context.Transactions.Where(t => t.SenderAccountId == orphan.Id || t.ReceiverAccountId == orphan.Id));
            context.Accounts.Remove(orphan);
            changed = true;
            logger.LogWarning("Yetim hesap silindi: AccountId={Id}", orphan.Id);
        }

        if (changed)
            context.SaveChanges();
    }

    private static string GenerateUniqueAccountNumber(VireonContext context)
    {
        string accountNumber;
        do
        {
            var number = Random.Shared.Next(1000, 99999);
            accountNumber = $"VR-{number:D5}";
        }
        while (context.Users.Any(u => u.AccountNumber == accountNumber) ||
               context.Accounts.Any(a => a.AccountNumber == accountNumber));
        return accountNumber;
    }
}
