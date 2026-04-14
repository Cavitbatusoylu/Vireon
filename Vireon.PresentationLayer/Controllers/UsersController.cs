using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;
using Vireon.PresentationLayer.DTOs;


namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly VireonContext _context;

        public UsersController(VireonContext context) { _context = context; }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterDto registerDto)
        {
            // Email kontrolü
            if (_context.Users.Any(u => u.Email == registerDto.Email))
                return BadRequest(new { message = "Bu e-posta adresi zaten kullanılıyor." });

            // Kullanıcı oluştur
            var user = new User
            {
                Name = registerDto.Name,
                Surname = registerDto.Surname,
                Email = registerDto.Email,
                Password = registerDto.Password // TODO: Hash'lenmeli (BCrypt)
            };
            _context.Users.Add(user);
            _context.SaveChanges();

            // Hesap oluştur (VR-XXXX formatında)
            var accountNumber = $"VR-{user.Id:D4}";
            var account = new Account
            {
                UserId = user.Id,
                AccountNumber = accountNumber,
                Balance = 0,
                Currency = "TRY"
            };
            _context.Accounts.Add(account);

            // Günlük limit oluştur
            var dailyLimit = new DailyLimit
            {
                UserId = user.Id,
                MaxDailyLimit = 50000,
                UsedLimit = 0,
                LastResetDate = DateTime.Now.Date
            };
            _context.DailyLimits.Add(dailyLimit);

            _context.SaveChanges();

            return Ok(new
            {
                message = "Kayıt başarılı!",
                userId = user.Id,
                accountNumber = accountNumber,
                email = user.Email
            });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto loginDto)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == loginDto.Email && u.Password == loginDto.Password);

            if (user == null)
                return Unauthorized(new { message = "E-posta ya da şifre yanlış." });

            var account = _context.Accounts.FirstOrDefault(a => a.UserId == user.Id);

            return Ok(new
            {
                id = user.Id,
                name = user.Name,
                surname = user.Surname,
                email = user.Email,
                accountNumber = account?.AccountNumber,
                balance = account?.Balance ?? 0
            });
        }

        [HttpGet]
        public IActionResult GetUsers()
        {
            return Ok(_context.Users.ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetUser(int id)
        {
            var user = _context.Users.Find(id);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");
            return Ok(user);
        }

        [HttpPost]
        public IActionResult AddUser(User user)
        {
            _context.Users.Add(user);
            _context.SaveChanges();
            return Ok("Kullanıcı başarıyla eklendi!");
        }

        [HttpPut("{id}")]
        public IActionResult UpdateUser(int id, User user)
        {
            var existing = _context.Users.Find(id);
            if (existing == null) return NotFound("Kullanıcı bulunamadı.");
            existing.Name = user.Name;
            existing.Surname = user.Surname;
            existing.Email = user.Email;
            existing.Password = user.Password;
            _context.SaveChanges();
            return Ok("Kullanıcı güncellendi!");
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteUser(int id)
        {
            var user = _context.Users.Find(id);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");
            _context.Users.Remove(user);
            _context.SaveChanges();
            return Ok("Kullanıcı silindi!");
        }
    }
}

