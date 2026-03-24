using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase // Kullanıcı işlemlerini yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public UsersController(VireonContext context) // Veritabanı bağlamını enjekte eder
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetUsers() // Sistemdeki tüm kullanıcıları listeler
        {
            var values = _context.Users.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddUser(User user) // Sisteme yeni bir kullanıcı ekler
        {
            _context.Users.Add(user);
            _context.SaveChanges();
            return Ok("Kullanıcı başarıyla eklendi!");
        }
    }

}
