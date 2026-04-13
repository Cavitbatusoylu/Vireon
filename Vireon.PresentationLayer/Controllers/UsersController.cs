using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;
using Vireon.DtoLayer;


namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase // Kullanıcı işlemlerini yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public UsersController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetUsers() // Tüm kullanıcıları listeler
        {
            return Ok(_context.Users.ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetUser(int id) // ID ile kullanıcı getirir
        {
            var user = _context.Users.Find(id);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");
            return Ok(user);
        }

        [HttpPost]
        public IActionResult AddUser(User user) // Yeni kullanıcı ekler
        {
            _context.Users.Add(user);
            _context.SaveChanges();
            return Ok("Kullanıcı başarıyla eklendi!");
        }

        [HttpPut("{id}")]
        public IActionResult UpdateUser(int id, User user) // Kullanıcı bilgilerini günceller
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
        public IActionResult DeleteUser(int id) // Kullanıcı siler
        {
            var user = _context.Users.Find(id);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");
            _context.Users.Remove(user);
            _context.SaveChanges();
            return Ok("Kullanıcı silindi!");
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto loginDto)

        {
            // Veritabanında eşleşen kullanıcıyı bul
            var user = _context.Users.FirstOrDefault(u => u.Email == loginDto.Email && u.Password == loginDto.Password);


            if (user == null)
            {
                return Unauthorized(new { message = "E-posta ya da şifre yanlıştır. " });
            }

            // Başarılı giriş durumunda kullanıcı bilgilerini döndür
            return Ok(new
            {
                id = user.Id,
                name = user.Name,
                surname = user.Surname,
                email = user.Email
            });
        }
    }
}

