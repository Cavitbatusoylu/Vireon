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

        public AccountsController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetAccounts() // Tüm hesapları listeler
        {
            return Ok(_context.Accounts.ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetAccount(int id) // ID ile hesap getirir
        {
            var account = _context.Accounts.Find(id);
            if (account == null) return NotFound("Hesap bulunamadı.");
            return Ok(account);
        }

        [HttpPost]
        public IActionResult AddAccount(Account account) // Yeni hesap ekler
        {
            _context.Accounts.Add(account);
            _context.SaveChanges();
            return Ok("Hesap başarıyla eklendi!");
        }

        [HttpPut("{id}")]
        public IActionResult UpdateAccount(int id, Account account) // Hesap bilgilerini günceller
        {
            var existing = _context.Accounts.Find(id);
            if (existing == null) return NotFound("Hesap bulunamadı.");
            existing.AccountNumber = account.AccountNumber;
            existing.Balance = account.Balance;
            existing.Currency = account.Currency;
            _context.SaveChanges();
            return Ok("Hesap güncellendi!");
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteAccount(int id) // Hesap siler
        {
            var account = _context.Accounts.Find(id);
            if (account == null) return NotFound("Hesap bulunamadı.");
            _context.Accounts.Remove(account);
            _context.SaveChanges();
            return Ok("Hesap silindi!");
        }
    }
}
