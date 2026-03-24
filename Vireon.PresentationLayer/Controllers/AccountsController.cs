using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountsController : ControllerBase // Hesap işlemlerini yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public AccountsController(VireonContext context) // Veritabanı bağlamını enjekte eder
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAccounts() // Tüm hesapları listeler
        {
            var values = _context.Accounts.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddAccount(Account account) // Sisteme yeni bir hesap ekler
        {
            _context.Accounts.Add(account);
            _context.SaveChanges();
            return Ok("Hesap başarıyla eklendi!");
        }
    }

}
