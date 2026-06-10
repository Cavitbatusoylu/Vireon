using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.DataAccessLayer.Seeding;

/// <summary>
/// Demo hesaplar, şifre hash'leme ve başlangıç verisi senkronizasyonu.
/// </summary>
public static class DatabaseSeeder
{
    private sealed record DemoAccountSpec(
        string Name,
        string Surname,
        string Email,
        string Password,
        string AccountNo,
        decimal InitialBalance,
        decimal MaxDailyLimit,
        string Role);

    private static readonly DemoAccountSpec[] DemoAccounts =
    [
        new("Cavit Batu", "Soylu", "cavit@vireon.com", "admin123", "VR-99999", 1_000_000m, 100_000m, "Admin"),
        new("Enes", "Kaya", "enes@vireon.com", "enes123", "VR-88888", 50_000m, 100_000m, "User"),
        new("Kerem", "Arslan", "kerem@vireon.com", "kerem123", "VR-77777", 50_000m, 100_000m, "User"),
    ];

    public static void Seed(VireonContext context, ILogger logger, bool resetDemoIdsOnStartup)
    {
        MigratePlaintextPasswords(context, logger);
        EnsureAdminRole(context, logger);

        if (resetDemoIdsOnStartup)
            ResetDemoDatabaseToSequentialIds(context, logger);

        EnsureDemoAccounts(context, logger);
        RemoveTestUser(context, logger);
        ReportMissingPlainPasswords(context, logger);

        logger.LogInformation("✅ Database hazır!");
    }

    private static void MigratePlaintextPasswords(VireonContext context, ILogger logger)
    {
        var usersWithPlainPassword = context.Users
            .Where(u => u.Password != null && !u.Password.StartsWith("$2"))
            .ToList();

        if (usersWithPlainPassword.Count == 0) return;

        logger.LogInformation("🔐 {Count} kullanıcının şifresi hash'leniyor...", usersWithPlainPassword.Count);
        foreach (var user in usersWithPlainPassword)
        {
            if (string.IsNullOrEmpty(user.PlainPassword))
                user.PlainPassword = user.Password;
            user.Password = BCrypt.Net.BCrypt.HashPassword(user.PlainPassword);
            logger.LogInformation("  → {Email} şifresi hash'lendi (PlainPassword korundu)", user.Email);
        }

        context.SaveChanges();
        logger.LogInformation("✅ Tüm şifreler güvenli hale getirildi!");
    }

    private static void EnsureAdminRole(VireonContext context, ILogger logger)
    {
        var adminUser = context.Users.FirstOrDefault(u => u.Email == "cavit@vireon.com");
        if (adminUser == null || adminUser.Role == "Admin") return;

        adminUser.Role = "Admin";
        context.SaveChanges();
        logger.LogInformation("🛡️ Admin rolü atandı: {Email}", adminUser.Email);
    }

    private static void ResetDemoDatabaseToSequentialIds(VireonContext context, ILogger logger)
    {
        logger.LogWarning("🧹 Veritabanı sıfırlanıyor — demo hesaplar ID 1, 2, 3... olacak; eski kayıtlar siliniyor.");

        context.Database.ExecuteSqlRaw("DELETE FROM LedgerEntries;");
        context.Database.ExecuteSqlRaw("DELETE FROM FraudLogs;");
        context.Database.ExecuteSqlRaw("DELETE FROM Transactions;");
        context.Database.ExecuteSqlRaw("DELETE FROM DailyLimits;");
        context.Database.ExecuteSqlRaw("DELETE FROM Accounts;");
        context.Database.ExecuteSqlRaw("DELETE FROM Users;");
        context.Database.ExecuteSqlRaw(
            "DELETE FROM sqlite_sequence WHERE name IN ('Users','Accounts','Transactions','LedgerEntries','FraudLogs','DailyLimits');");

        logger.LogInformation("✅ Eski kullanıcı/işlem kayıtları temizlendi; demo hesaplar yeniden oluşturulacak.");
    }

    private static void EnsureDemoAccounts(VireonContext context, ILogger logger)
    {
        logger.LogInformation("🔄 Demo hesapları senkronize ediliyor...");

        foreach (var spec in DemoAccounts)
        {
            var user = context.Users.FirstOrDefault(u => u.Email == spec.Email);
            if (user == null)
            {
                user = new User
                {
                    Name = spec.Name,
                    Surname = spec.Surname,
                    Email = spec.Email,
                    Password = BCrypt.Net.BCrypt.HashPassword(spec.Password),
                    PlainPassword = spec.Password,
                    AccountNumber = spec.AccountNo,
                    CreatedAt = DateTime.Now,
                    Role = spec.Role
                };
                context.Users.Add(user);
                context.SaveChanges();

                var account = new Account
                {
                    UserId = user.Id,
                    AccountNumber = spec.AccountNo,
                    Balance = spec.InitialBalance,
                    Currency = "TRY"
                };
                context.Accounts.Add(account);
                context.SaveChanges();

                context.DailyLimits.Add(new DailyLimit
                {
                    UserId = user.Id,
                    MaxDailyLimit = spec.MaxDailyLimit,
                    UsedLimit = 0m,
                    LastResetDate = DateTime.Now.Date
                });

                context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = account.Id,
                    Amount = spec.InitialBalance,
                    PreviousBalance = 0m,
                    NewBalance = spec.InitialBalance,
                    Description = "Hesap oluşturma - Demo seed",
                    CreatedAt = DateTime.Now
                });

                context.SaveChanges();
                logger.LogInformation("  ➕ {Email} → {AccountNo} ({Balance:N2} TRY)", spec.Email, spec.AccountNo, spec.InitialBalance);
                continue;
            }

            user.Name = spec.Name;
            user.Surname = spec.Surname;
            user.Role = spec.Role;
            user.AccountNumber = spec.AccountNo;
            EnsureDemoPassword(user, spec.Password);

            var existingAccount = context.Accounts.FirstOrDefault(a => a.UserId == user.Id);
            if (existingAccount == null)
            {
                existingAccount = new Account
                {
                    UserId = user.Id,
                    AccountNumber = spec.AccountNo,
                    Balance = spec.InitialBalance,
                    Currency = "TRY"
                };
                context.Accounts.Add(existingAccount);
                context.SaveChanges();

                context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = existingAccount.Id,
                    Amount = spec.InitialBalance,
                    PreviousBalance = 0m,
                    NewBalance = spec.InitialBalance,
                    Description = "Hesap oluşturma - Demo seed",
                    CreatedAt = DateTime.Now
                });
            }
            else
            {
                existingAccount.AccountNumber = spec.AccountNo;
            }

            var limit = context.DailyLimits.FirstOrDefault(d => d.UserId == user.Id);
            if (limit == null)
            {
                context.DailyLimits.Add(new DailyLimit
                {
                    UserId = user.Id,
                    MaxDailyLimit = spec.MaxDailyLimit,
                    UsedLimit = 0m,
                    LastResetDate = DateTime.Now.Date
                });
            }
            else
            {
                limit.MaxDailyLimit = spec.MaxDailyLimit;
            }

            logger.LogInformation("  ✓ {Email} güncellendi ({AccountNo})", spec.Email, spec.AccountNo);
        }

        context.SaveChanges();
        logger.LogInformation("✅ Demo hesapları hazır.");
    }

    private static void RemoveTestUser(VireonContext context, ILogger logger)
    {
        var testUser = context.Users.FirstOrDefault(u => u.Email == "testuser@example.com");
        if (testUser == null) return;

        var testAccountIds = context.Accounts.Where(a => a.UserId == testUser.Id).Select(a => a.Id).ToList();
        foreach (var accId in testAccountIds)
        {
            context.LedgerEntries.RemoveRange(context.LedgerEntries.Where(l => l.AccountId == accId));
            context.FraudLogs.RemoveRange(context.FraudLogs.Where(f => f.AccountId == accId));
            context.Transactions.RemoveRange(
                context.Transactions.Where(t => t.SenderAccountId == accId || t.ReceiverAccountId == accId));
        }

        context.DailyLimits.RemoveRange(context.DailyLimits.Where(d => d.UserId == testUser.Id));
        context.Accounts.RemoveRange(context.Accounts.Where(a => a.UserId == testUser.Id));
        context.Users.Remove(testUser);
        context.SaveChanges();
        logger.LogInformation("🗑️ Test kullanıcısı silindi: testuser@example.com");
    }

    private static void EnsureDemoPassword(User user, string plainPassword)
    {
        if (string.IsNullOrEmpty(user.Password) ||
            !user.Password.StartsWith("$2", StringComparison.Ordinal) ||
            !BCrypt.Net.BCrypt.Verify(plainPassword, user.Password))
        {
            user.Password = BCrypt.Net.BCrypt.HashPassword(plainPassword);
        }

        user.PlainPassword = plainPassword;
    }

    private static void ReportMissingPlainPasswords(VireonContext context, ILogger logger)
    {
        var missing = context.Users
            .Where(u => u.PlainPassword == null || u.PlainPassword == "")
            .Select(u => u.Email)
            .ToList();

        if (missing.Count == 0) return;

        logger.LogInformation(
            "ℹ️ PlainPassword boş {Count} hesap — bir kez giriş veya şifre sıfırlama sonrası DB'ye yazılır: {Emails}",
            missing.Count,
            string.Join(", ", missing));
    }
}
