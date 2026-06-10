using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Vireon.BusinessLayer.Abstract;
using Vireon.BusinessLayer.Models;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.DtoLayer.DTOs;
using Vireon.EntityLayer.Concrete;

namespace Vireon.BusinessLayer.Concrete;

public class UserService : IUserService
{
    private readonly VireonContext _context;
    private readonly ILogger<UserService> _logger;

    public UserService(VireonContext context, ILogger<UserService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public object GetAllUsers() =>
        _context.Users
            .OrderByDescending(u => u.Id)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Surname,
                u.Email,
                u.AccountNumber,
                u.CreatedAt,
                u.Role
            }).ToList();

    public object? GetUserById(int id)
    {
        var user = _context.Users.Find(id);
        if (user == null) return null;
        return new
        {
            user.Id,
            user.Name,
            user.Surname,
            user.Email,
            user.AccountNumber,
            user.CreatedAt,
            user.Role
        };
    }

    public ServiceResult<object> Register(RegisterDto model)
    {
        if (string.IsNullOrWhiteSpace(model.Name) || string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
            return ServiceResult<object>.Fail("Ad, e-posta ve şifre zorunludur.");

        if (model.Password.Length < 6)
            return ServiceResult<object>.Fail("Şifre en az 6 karakter olmalıdır.");

        if (_context.Users.Any(u => u.Email == model.Email))
            return ServiceResult<object>.Fail("Bu e-posta adresi zaten kayıtlıdır.");

        using var transaction = _context.Database.BeginTransaction();
        try
        {
            var accountNumber = GenerateAccountNumber();
            var user = new User
            {
                Name = model.Name.Trim(),
                Surname = string.IsNullOrWhiteSpace(model.Surname) ? model.Name.Trim() : model.Surname.Trim(),
                Email = model.Email.Trim().ToLowerInvariant(),
                AccountNumber = accountNumber,
                CreatedAt = DateTime.Now
            };
            SetUserPassword(user, model.Password);
            _context.Users.Add(user);
            _context.SaveChanges();

            var account = new Account
            {
                UserId = user.Id,
                AccountNumber = accountNumber,
                Balance = 0m,
                Currency = "TRY"
            };
            _context.Accounts.Add(account);

            _context.DailyLimits.Add(new DailyLimit
            {
                UserId = user.Id,
                MaxDailyLimit = 50000m,
                UsedLimit = 0m,
                LastResetDate = DateTime.Now.Date
            });

            _context.SaveChanges();

            _context.LedgerEntries.Add(new LedgerEntry
            {
                AccountId = account.Id,
                Amount = 0m,
                PreviousBalance = 0m,
                NewBalance = 0m,
                Description = "Hesap oluşturuldu",
                CreatedAt = DateTime.Now
            });

            _context.SaveChanges();
            transaction.Commit();

            _logger.LogInformation("✅ Yeni kullanıcı kaydı: {Name} {Surname} ({Email}) - Hesap: {AccountNumber}",
                user.Name, user.Surname, user.Email, accountNumber);

            return ServiceResult<object>.Ok(new
            {
                message = "Kayıt başarılı!",
                accountNumber,
                userId = user.Id
            });
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            _logger.LogError(ex, "❌ Kullanıcı kaydı başarısız: {Message}", ex.Message);
            return ServiceResult<object>.Fail("Kayıt sırasında bir hata oluştu.", 500);
        }
    }

    public ServiceResult<object> Login(LoginDto model)
    {
        if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
            return ServiceResult<object>.Fail("E-posta ve şifre zorunludur.");

        var emailInput = model.Email.Trim();
        var emailLower = emailInput.ToLowerInvariant();
        var user = _context.Users.FirstOrDefault(u => u.Email == emailLower || u.Email == emailInput);

        if (user == null)
        {
            _logger.LogWarning("⚠️ Kullanıcı bulunamadı: {Email}", emailInput);
            return ServiceResult<object>.Fail("E-posta veya şifre hatalı.", 401);
        }

        if (!BCrypt.Net.BCrypt.Verify(model.Password, user.Password))
        {
            _logger.LogWarning("⚠️ Şifre hatalı: {Email}", emailInput);
            return ServiceResult<object>.Fail("E-posta veya şifre hatalı.", 401);
        }

        SyncPlainPasswordIfNeeded(user, model.Password);
        _context.SaveChanges();

        var account = _context.Accounts.FirstOrDefault(a => a.UserId == user.Id);
        _logger.LogInformation("✅ Başarılı giriş: {Name} ({Email}) - Hesap: {AccountNumber}", user.Name, user.Email, user.AccountNumber);

        return ServiceResult<object>.Ok(new
        {
            id = user.Id,
            name = user.Name,
            surname = user.Surname,
            email = user.Email,
            accountNumber = user.AccountNumber ?? "",
            balance = account?.Balance ?? 0m,
            currency = account?.Currency ?? "TRY",
            accountId = account?.Id ?? 0,
            createdAt = user.CreatedAt,
            role = user.Role
        });
    }

    public ServiceResult<object> ForgotPassword(ForgotPasswordModel model)
    {
        if (string.IsNullOrWhiteSpace(model.Email) ||
            string.IsNullOrWhiteSpace(model.AccountNumber) ||
            string.IsNullOrWhiteSpace(model.NewPassword))
            return ServiceResult<object>.Fail("E-posta, hesap numarası ve yeni şifre zorunludur.");

        if (model.NewPassword.Length < 6)
            return ServiceResult<object>.Fail("Yeni şifre en az 6 karakter olmalıdır.");

        if (model.NewPassword != model.ConfirmPassword)
            return ServiceResult<object>.Fail("Yeni şifreler eşleşmiyor.");

        var email = model.Email.Trim().ToLowerInvariant();
        var accountNo = model.AccountNumber.Trim().ToUpperInvariant();
        var user = _context.Users.FirstOrDefault(u =>
            (u.Email == email || u.Email == model.Email.Trim()) &&
            u.AccountNumber == accountNo);

        if (user == null)
            return ServiceResult<object>.Fail("E-posta ve hesap numarası eşleşen kullanıcı bulunamadı.", 404);

        SetUserPassword(user, model.NewPassword);
        _context.SaveChanges();

        _logger.LogInformation("🔑 Şifre sıfırlandı: {Email} ({AccountNumber})", user.Email, user.AccountNumber);
        return ServiceResult<object>.Ok(new { message = "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz." });
    }

    public ServiceResult<object> DeleteAccount(int id, DeleteAccountModel model)
    {
        if (string.IsNullOrWhiteSpace(model.Password) ||
            string.IsNullOrWhiteSpace(model.ConfirmEmail) ||
            string.IsNullOrWhiteSpace(model.ConfirmPhrase))
            return ServiceResult<object>.Fail("Şifre, e-posta onayı ve onay metni zorunludur.");

        var user = _context.Users.Find(id);
        if (user == null)
            return ServiceResult<object>.Fail("Kullanıcı bulunamadı.", 404);

        if (IsProtectedDemoAccount(user.Email))
            return ServiceResult<object>.Fail("Admin demo hesabı silinemez.");

        var expectedPhraseTr = "HESABIMI SIL";
        var expectedPhraseEn = "DELETE MY ACCOUNT";
        var phrase = model.ConfirmPhrase.Trim().ToUpperInvariant();
        if (phrase != expectedPhraseTr && phrase != expectedPhraseEn)
            return ServiceResult<object>.Fail("Onay metni hatalı. Lütfen HESABIMI SIL yazın.");

        var confirmEmail = model.ConfirmEmail.Trim().ToLowerInvariant();
        if (confirmEmail != user.Email.Trim().ToLowerInvariant())
            return ServiceResult<object>.Fail("E-posta onayı hesabınızla eşleşmiyor.");

        if (!BCrypt.Net.BCrypt.Verify(model.Password, user.Password))
            return ServiceResult<object>.Fail("Şifre hatalı.", 401);

        var deletedEmail = user.Email;
        using var transaction = _context.Database.BeginTransaction();
        try
        {
            RemoveUserAndRelatedData(user);
            transaction.Commit();
            _logger.LogWarning("🗑️ Kullanıcı hesabı silindi: {Email} (ID {Id})", deletedEmail, id);
            return ServiceResult<object>.Ok(new { message = "Hesabınız kalıcı olarak silindi." });
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            _logger.LogError(ex, "❌ Hesap silme başarısız: {Email}", deletedEmail);
            return ServiceResult<object>.Fail("Hesap silinirken bir hata oluştu.", 500);
        }
    }

    public ServiceResult<object> UpdateUser(int id, UserUpdateModel model)
    {
        var existing = _context.Users.Find(id);
        if (existing == null)
            return ServiceResult<object>.Fail("Kullanıcı bulunamadı.", 404);

        if (!string.IsNullOrWhiteSpace(model.Name)) existing.Name = model.Name.Trim();
        if (!string.IsNullOrWhiteSpace(model.Surname)) existing.Surname = model.Surname.Trim();

        if (!string.IsNullOrWhiteSpace(model.Email) && model.Email.Trim().ToLowerInvariant() != existing.Email)
        {
            var emailNormalized = model.Email.Trim().ToLowerInvariant();
            if (_context.Users.Any(u => u.Email == emailNormalized && u.Id != id))
                return ServiceResult<object>.Fail("Bu e-posta adresi zaten kayıtlıdır.");
            existing.Email = emailNormalized;
        }

        if (!string.IsNullOrWhiteSpace(model.Password))
            SetUserPassword(existing, model.Password);

        _context.SaveChanges();
        _logger.LogInformation("✅ Kullanıcı güncellendi: {Id} - {Name}", id, existing.Name);
        return ServiceResult<object>.Ok(new { message = "Kullanıcı güncellendi." });
    }

    public object? SearchByAccountNumber(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber)) return null;

        var user = _context.Users.FirstOrDefault(u => u.AccountNumber == accountNumber.Trim().ToUpperInvariant());
        if (user == null) return null;

        var account = _context.Accounts.FirstOrDefault(a => a.UserId == user.Id);
        return new
        {
            id = user.Id,
            name = user.Name,
            surname = user.Surname,
            accountNumber = user.AccountNumber,
            balance = account?.Balance ?? 0m
        };
    }

    public object GetAdminStats()
    {
        var totalBalance = _context.Users
            .Select(u => new
            {
                u.Email,
                u.Role,
                Balance = _context.Accounts.Where(a => a.UserId == u.Id).Select(a => a.Balance).FirstOrDefault()
            })
            .AsEnumerable()
            .Sum(u => AdminPanelDisplayBalance(u.Email, u.Role, u.Balance));

        return new
        {
            totalUsers = _context.Users.Count(),
            totalAccounts = _context.Accounts.Count(),
            totalTransactions = _context.Transactions.Count(),
            totalDeposits = _context.Transactions.Count(t => t.SenderAccountId == t.ReceiverAccountId),
            totalTransfers = _context.Transactions.Count(t => t.SenderAccountId != t.ReceiverAccountId),
            totalBalance,
            totalFraudLogs = _context.FraudLogs.Count(),
            totalLedgerEntries = _context.LedgerEntries.Count(),
            serverTime = DateTime.Now
        };
    }

    public object GetAdminUsers() =>
        _context.Users
            .OrderByDescending(u => u.Id)
            .ThenByDescending(u => u.Role == "Admin")
            .ThenBy(u => u.Name)
            .ThenBy(u => u.Surname)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Surname,
                u.Email,
                u.AccountNumber,
                u.CreatedAt,
                u.Role,
                Balance = _context.Accounts.Where(a => a.UserId == u.Id).Select(a => a.Balance).FirstOrDefault(),
                TransactionCount = _context.Transactions.Count(t =>
                    _context.Accounts.Where(a => a.UserId == u.Id).Select(a => a.Id).Contains(t.SenderAccountId) ||
                    _context.Accounts.Where(a => a.UserId == u.Id).Select(a => a.Id).Contains(t.ReceiverAccountId))
            })
            .AsEnumerable()
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Surname,
                u.Email,
                u.AccountNumber,
                u.CreatedAt,
                u.Role,
                Balance = AdminPanelDisplayBalance(u.Email, u.Role, u.Balance),
                u.TransactionCount
            })
            .ToList();

    public object GetAdminTransactions() =>
        _context.Transactions
            .OrderByDescending(t => t.Date)
            .Select(t => new
            {
                t.Id,
                t.Amount,
                t.Date,
                t.Description,
                Status = t.Status.ToString(),
                SenderAccount = _context.Accounts.Where(a => a.Id == t.SenderAccountId).Select(a => a.AccountNumber).FirstOrDefault(),
                ReceiverAccount = _context.Accounts.Where(a => a.Id == t.ReceiverAccountId).Select(a => a.AccountNumber).FirstOrDefault(),
                SenderName = _context.Users.Where(u => _context.Accounts.Where(a => a.Id == t.SenderAccountId).Select(a => a.UserId).Contains(u.Id)).Select(u => u.Name + " " + u.Surname).FirstOrDefault(),
                ReceiverName = _context.Users.Where(u => _context.Accounts.Where(a => a.Id == t.ReceiverAccountId).Select(a => a.UserId).Contains(u.Id)).Select(u => u.Name + " " + u.Surname).FirstOrDefault(),
                Type = t.SenderAccountId == t.ReceiverAccountId ? "Deposit" : "Transfer"
            })
            .Take(100)
            .ToList();

    private static decimal AdminPanelDisplayBalance(string? email, string? role, decimal actualBalance)
    {
        var e = (email ?? "").Trim().ToLowerInvariant();
        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) || e == "cavit@vireon.com")
            return 100_000m;
        if (e == "enes@vireon.com" || e == "kerem@vireon.com")
            return 50_000m;
        return actualBalance;
    }

    private string GenerateAccountNumber()
    {
        string accountNumber;
        do
        {
            var number = Random.Shared.Next(1000, 99999);
            accountNumber = $"VR-{number:D5}";
        } while (_context.Users.Any(u => u.AccountNumber == accountNumber) ||
                 _context.Accounts.Any(a => a.AccountNumber == accountNumber));
        return accountNumber;
    }

    private static void SetUserPassword(User user, string plainPassword)
    {
        var plain = (plainPassword ?? "").Trim();
        user.PlainPassword = plain;
        user.Password = BCrypt.Net.BCrypt.HashPassword(plain);
    }

    private static void SyncPlainPasswordIfNeeded(User user, string plainPassword)
    {
        var plain = (plainPassword ?? "").Trim();
        if (string.IsNullOrEmpty(plain)) return;
        if (!string.Equals(user.PlainPassword, plain, StringComparison.Ordinal))
            user.PlainPassword = plain;
    }

    private static bool IsProtectedDemoAccount(string? email) =>
        string.Equals((email ?? "").Trim(), "cavit@vireon.com", StringComparison.OrdinalIgnoreCase);

    private void RemoveUserAndRelatedData(User user)
    {
        var accountIds = _context.Accounts.Where(a => a.UserId == user.Id).Select(a => a.Id).ToList();
        if (accountIds.Count > 0)
        {
            _context.LedgerEntries.RemoveRange(_context.LedgerEntries.Where(l => accountIds.Contains(l.AccountId)));
            _context.FraudLogs.RemoveRange(_context.FraudLogs.Where(f => accountIds.Contains(f.AccountId)));
            _context.Transactions.RemoveRange(_context.Transactions.Where(t =>
                accountIds.Contains(t.SenderAccountId) || accountIds.Contains(t.ReceiverAccountId)));
        }

        _context.DailyLimits.RemoveRange(_context.DailyLimits.Where(d => d.UserId == user.Id));
        _context.Accounts.RemoveRange(_context.Accounts.Where(a => a.UserId == user.Id));
        _context.Users.Remove(user);
        _context.SaveChanges();
    }
}
