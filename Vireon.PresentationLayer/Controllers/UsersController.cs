using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.DtoLayer.DTOs;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase // Kullanıcı işlemlerini yöneten API denetleyicisi
    {
        private readonly VireonContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(VireonContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/users — Tüm kullanıcıları listeler
        [HttpGet]
        public IActionResult GetUsers()
        {
            var users = _context.Users
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
            return Ok(users);
        }

        // GET: api/users/{id} — ID ile kullanıcı getirir
        [HttpGet("{id}")]
        public IActionResult GetUser(int id)
        {
            var user = _context.Users.Find(id);
            if (user == null) return NotFound(new { message = "Kullanıcı bulunamadı." });
            return Ok(new
            {
                user.Id,
                user.Name,
                user.Surname,
                user.Email,
                user.AccountNumber,
                user.CreatedAt,
                user.Role
            });
        }

        // POST: api/users — Yeni kullanıcı ekler (eski uyumluluk için)
        [HttpPost]
        public IActionResult AddUser([FromBody] UserCreateModel model)
        {
            return RegisterInternal(model);
        }

        // POST: api/users/register — Kayıt: User + Account + DailyLimit atomik olarak oluşturur
        [HttpPost("register")]
        public IActionResult Register([FromBody] UserCreateModel model)
        {
            return RegisterInternal(model);
        }

        private IActionResult RegisterInternal(UserCreateModel model)
        {
            // Validasyon
            if (string.IsNullOrWhiteSpace(model.Name) || string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest(new { message = "Ad, e-posta ve şifre zorunludur." });
            }

            if (model.Password.Length < 6)
            {
                return BadRequest(new { message = "Şifre en az 6 karakter olmalıdır." });
            }

            // E-posta kontrolü
            if (_context.Users.Any(u => u.Email == model.Email))
            {
                return BadRequest(new { message = "Bu e-posta adresi zaten kayıtlıdır." });
            }

            using var transaction = _context.Database.BeginTransaction();
            try
            {
                // 1. Benzersiz hesap numarası oluştur
                var accountNumber = GenerateAccountNumber();

                // 2. Kullanıcı oluştur
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
                _context.SaveChanges(); // User ID alınır

                // 3. Hesap oluştur (0₺ başlangıç bakiyesi)
                var account = new Account
                {
                    UserId = user.Id,
                    AccountNumber = accountNumber,
                    Balance = 0m,
                    Currency = "TRY"
                };
                _context.Accounts.Add(account);

                // 4. Günlük limit oluştur (50.000₺ varsayılan)
                var dailyLimit = new DailyLimit
                {
                    UserId = user.Id,
                    MaxDailyLimit = 50000m,
                    UsedLimit = 0m,
                    LastResetDate = DateTime.Now.Date
                };
                _context.DailyLimits.Add(dailyLimit);

                // 5. Ledger kaydı (başlangıç bakiyesi)
                _context.SaveChanges(); // Account ID alınır

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

                return Ok(new
                {
                    message = "Kayıt başarılı!",
                    accountNumber = accountNumber,
                    userId = user.Id
                });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                _logger.LogError(ex, "❌ Kullanıcı kaydı başarısız: {Message}", ex.Message);
                return StatusCode(500, new { message = "Kayıt sırasında bir hata oluştu." });
            }
        }

        // POST: api/users/login — Kullanıcı girişi
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest(new { message = "E-posta ve şifre zorunludur." });
            }

            var emailInput = model.Email.Trim();
            var emailLower = emailInput.ToLowerInvariant();

            // E-posta eşleşmesini hem orijinal hem lowercase ile dene
            var user = _context.Users.FirstOrDefault(u => 
                u.Email == emailLower || u.Email == emailInput);
            
            if (user == null)
            {
                _logger.LogWarning("⚠️ Kullanıcı bulunamadı: {Email}", emailInput);
                return Unauthorized(new { message = "E-posta veya şifre hatalı." });
            }

            if (!BCrypt.Net.BCrypt.Verify(model.Password, user.Password))
            {
                _logger.LogWarning("⚠️ Şifre hatalı: {Email}", emailInput);
                return Unauthorized(new { message = "E-posta veya şifre hatalı." });
            }

            SyncPlainPasswordIfNeeded(user, model.Password);
            _context.SaveChanges();

            // Kullanıcının hesap bilgisini al
            var account = _context.Accounts.FirstOrDefault(a => a.UserId == user.Id);

            _logger.LogInformation("✅ Başarılı giriş: {Name} ({Email}) - Hesap: {AccountNumber}", 
                user.Name, user.Email, user.AccountNumber);

            return Ok(new
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

        // POST: api/users/forgot-password — E-posta + hesap no ile şifre sıfırlama
        [HttpPost("forgot-password")]
        public IActionResult ForgotPassword([FromBody] ForgotPasswordModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Email) ||
                string.IsNullOrWhiteSpace(model.AccountNumber) ||
                string.IsNullOrWhiteSpace(model.NewPassword))
            {
                return BadRequest(new { message = "E-posta, hesap numarası ve yeni şifre zorunludur." });
            }

            if (model.NewPassword.Length < 6)
                return BadRequest(new { message = "Yeni şifre en az 6 karakter olmalıdır." });

            if (model.NewPassword != model.ConfirmPassword)
                return BadRequest(new { message = "Yeni şifreler eşleşmiyor." });

            var email = model.Email.Trim().ToLowerInvariant();
            var accountNo = model.AccountNumber.Trim().ToUpperInvariant();

            var user = _context.Users.FirstOrDefault(u =>
                (u.Email == email || u.Email == model.Email.Trim()) &&
                u.AccountNumber == accountNo);

            if (user == null)
                return NotFound(new { message = "E-posta ve hesap numarası eşleşen kullanıcı bulunamadı." });

            SetUserPassword(user, model.NewPassword);
            _context.SaveChanges();

            _logger.LogInformation("🔑 Şifre sıfırlandı: {Email} ({AccountNumber})", user.Email, user.AccountNumber);
            return Ok(new { message = "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz." });
        }

        // POST: api/users/{id}/delete-account — Hesabı kalıcı olarak sil
        [HttpPost("{id}/delete-account")]
        public IActionResult DeleteAccount(int id, [FromBody] DeleteAccountModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Password) ||
                string.IsNullOrWhiteSpace(model.ConfirmEmail) ||
                string.IsNullOrWhiteSpace(model.ConfirmPhrase))
            {
                return BadRequest(new { message = "Şifre, e-posta onayı ve onay metni zorunludur." });
            }

            var user = _context.Users.Find(id);
            if (user == null)
                return NotFound(new { message = "Kullanıcı bulunamadı." });

            if (IsProtectedDemoAccount(user.Email))
            {
                return BadRequest(new { message = "Admin demo hesabı silinemez." });
            }

            var expectedPhraseTr = "HESABIMI SIL";
            var expectedPhraseEn = "DELETE MY ACCOUNT";
            var phrase = model.ConfirmPhrase.Trim().ToUpperInvariant();
            if (phrase != expectedPhraseTr && phrase != expectedPhraseEn)
            {
                return BadRequest(new { message = "Onay metni hatalı. Lütfen HESABIMI SIL yazın." });
            }

            var confirmEmail = model.ConfirmEmail.Trim().ToLowerInvariant();
            if (confirmEmail != user.Email.Trim().ToLowerInvariant())
                return BadRequest(new { message = "E-posta onayı hesabınızla eşleşmiyor." });

            if (!BCrypt.Net.BCrypt.Verify(model.Password, user.Password))
                return Unauthorized(new { message = "Şifre hatalı." });

            var deletedEmail = user.Email;
            using var transaction = _context.Database.BeginTransaction();
            try
            {
                RemoveUserAndRelatedData(user);
                transaction.Commit();
                _logger.LogWarning("🗑️ Kullanıcı hesabı silindi: {Email} (ID {Id})", deletedEmail, id);
                return Ok(new { message = "Hesabınız kalıcı olarak silindi." });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                _logger.LogError(ex, "❌ Hesap silme başarısız: {Email}", deletedEmail);
                return StatusCode(500, new { message = "Hesap silinirken bir hata oluştu." });
            }
        }

        // PUT: api/users/{id} — Kullanıcı bilgilerini günceller
        [HttpPut("{id}")]
        public IActionResult UpdateUser(int id, [FromBody] UserUpdateModel model)
        {
            var existing = _context.Users.Find(id);
            if (existing == null) return NotFound(new { message = "Kullanıcı bulunamadı." });

            if (!string.IsNullOrWhiteSpace(model.Name)) existing.Name = model.Name.Trim();
            if (!string.IsNullOrWhiteSpace(model.Surname)) existing.Surname = model.Surname.Trim();

            // E-posta değişikliği varsa benzersizlik kontrolü
            if (!string.IsNullOrWhiteSpace(model.Email) && model.Email.Trim().ToLowerInvariant() != existing.Email)
            {
                var emailNormalized = model.Email.Trim().ToLowerInvariant();
                if (_context.Users.Any(u => u.Email == emailNormalized && u.Id != id))
                {
                    return BadRequest(new { message = "Bu e-posta adresi zaten kayıtlıdır." });
                }
                existing.Email = emailNormalized;
            }

            if (!string.IsNullOrWhiteSpace(model.Password))
                SetUserPassword(existing, model.Password);

            _context.SaveChanges();
            _logger.LogInformation("✅ Kullanıcı güncellendi: {Id} - {Name}", id, existing.Name);

            return Ok(new { message = "Kullanıcı güncellendi." });
        }

        // GET: api/users/search?accountNumber=VR-0001 — Hesap numarasıyla arama
        [HttpGet("search")]
        public IActionResult SearchByAccountNumber([FromQuery] string accountNumber)
        {
            if (string.IsNullOrWhiteSpace(accountNumber))
                return BadRequest(new { message = "Hesap numarası gerekli." });

            var user = _context.Users.FirstOrDefault(u => u.AccountNumber == accountNumber.Trim().ToUpperInvariant());
            if (user == null)
                return NotFound(new { message = "Kullanıcı bulunamadı." });

            var account = _context.Accounts.FirstOrDefault(a => a.UserId == user.Id);

            return Ok(new
            {
                id = user.Id,
                name = user.Name,
                surname = user.Surname,
                accountNumber = user.AccountNumber,
                balance = account?.Balance ?? 0m
            });
        }

        // ========== ADMIN PANELİ ==========
        // GET: api/users/admin-stats — Genel sistem istatistikleri (Admin için)
        [HttpGet("admin-stats")]
        public IActionResult GetAdminStats()
        {
            var totalUsers = _context.Users.Count();
            var totalAccounts = _context.Accounts.Count();
            var totalTransactions = _context.Transactions.Count();
            var totalDeposits = _context.Transactions.Count(t => t.SenderAccountId == t.ReceiverAccountId);
            var totalTransfers = _context.Transactions.Count(t => t.SenderAccountId != t.ReceiverAccountId);
            // Admin panel sunum bakiyeleri (DB/ledger değişmez)
            var totalBalance = _context.Users
                .Select(u => new
                {
                    u.Email,
                    u.Role,
                    Balance = _context.Accounts.Where(a => a.UserId == u.Id).Select(a => a.Balance).FirstOrDefault()
                })
                .AsEnumerable()
                .Sum(u => AdminPanelDisplayBalance(u.Email, u.Role, u.Balance));
            var totalFraudLogs = _context.FraudLogs.Count();
            var totalLedgerEntries = _context.LedgerEntries.Count();

            return Ok(new
            {
                totalUsers,
                totalAccounts,
                totalTransactions,
                totalDeposits,
                totalTransfers,
                totalBalance,
                totalFraudLogs,
                totalLedgerEntries,
                serverTime = DateTime.Now
            });
        }

        // GET: api/users/admin-users — Tüm kullanıcılar (Admin paneli detaylı)
        [HttpGet("admin-users")]
        public IActionResult GetAdminUsers()
        {
            var users = _context.Users
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

            return Ok(users);
        }

        // GET: api/users/admin-transactions — Tüm işlem kayıtları (Admin paneli)
        [HttpGet("admin-transactions")]
        public IActionResult GetAdminTransactions()
        {
            var transactions = _context.Transactions
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

            return Ok(transactions);
        }

        /// <summary>Admin panel / sunum — gerçek bakiye DB'de kalır, işlem geçmişi değişmez.</summary>
        private static decimal AdminPanelDisplayBalance(string? email, string? role, decimal actualBalance)
        {
            var e = (email ?? "").Trim().ToLowerInvariant();
            if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
                || e == "cavit@vireon.com")
                return 100_000m;
            if (e == "enes@vireon.com" || e == "kerem@vireon.com")
                return 50_000m;
            return actualBalance;
        }

        // Benzersiz hesap numarası üretici (VR-XXXX formatında)
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

        /// <summary>Eski kayıtlarda PlainPassword boşsa, başarılı girişte DB'ye yazar.</summary>
        private static void SyncPlainPasswordIfNeeded(User user, string plainPassword)
        {
            var plain = (plainPassword ?? "").Trim();
            if (string.IsNullOrEmpty(plain)) return;
            if (!string.Equals(user.PlainPassword, plain, StringComparison.Ordinal))
                user.PlainPassword = plain;
        }

        private static bool IsProtectedDemoAccount(string? email)
        {
            return string.Equals((email ?? "").Trim(), "cavit@vireon.com", StringComparison.OrdinalIgnoreCase);
        }

        private void RemoveUserAndRelatedData(User user)
        {
            var accountIds = _context.Accounts.Where(a => a.UserId == user.Id).Select(a => a.Id).ToList();

            if (accountIds.Count > 0)
            {
                _context.LedgerEntries.RemoveRange(
                    _context.LedgerEntries.Where(l => accountIds.Contains(l.AccountId)));
                _context.FraudLogs.RemoveRange(
                    _context.FraudLogs.Where(f => accountIds.Contains(f.AccountId)));
                _context.Transactions.RemoveRange(
                    _context.Transactions.Where(t =>
                        accountIds.Contains(t.SenderAccountId) || accountIds.Contains(t.ReceiverAccountId)));
            }

            _context.DailyLimits.RemoveRange(_context.DailyLimits.Where(d => d.UserId == user.Id));
            _context.Accounts.RemoveRange(_context.Accounts.Where(a => a.UserId == user.Id));
            _context.Users.Remove(user);
            _context.SaveChanges();
        }
    }

}
