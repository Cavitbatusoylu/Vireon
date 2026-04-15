using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
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
            var users = _context.Users.Select(u => new
            {
                u.Id,
                u.Name,
                u.Surname,
                u.Email,
                u.AccountNumber,
                u.CreatedAt
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
                user.Password,
                user.AccountNumber,
                user.CreatedAt
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
                    Password = model.Password,
                    AccountNumber = accountNumber,
                    CreatedAt = DateTime.Now
                };
                _context.Users.Add(user);
                _context.SaveChanges(); // User ID alınır

                // 3. Hesap oluştur (10.000₺ başlangıç bakiyesi)
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

            if (user.Password != model.Password)
            {
                _logger.LogWarning("⚠️ Şifre hatalı: {Email}", emailInput);
                return Unauthorized(new { message = "E-posta veya şifre hatalı." });
            }

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
                createdAt = user.CreatedAt
            });
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

            if (!string.IsNullOrWhiteSpace(model.Password)) existing.Password = model.Password;

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
    }

    // DTO modelleri
    public class UserCreateModel
    {
        public string Name { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserUpdateModel
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
