using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransactionsController : ControllerBase // Para transferlerini yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public TransactionsController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetTransactions() // Admin: tüm işlemler, normal kullanıcı: sadece kendi hesaplarına ait işlemler
        {
            if (User.IsInRole("Admin")) return Ok(_context.Transactions.ToList());

            var ownAccountIds = _context.Accounts.Where(a => a.UserId == CurrentUserId).Select(a => a.Id).ToList();
            return Ok(_context.Transactions
                .Where(t => ownAccountIds.Contains(t.SenderAccountId) || ownAccountIds.Contains(t.ReceiverAccountId))
                .ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetTransaction(int id) // ID ile işlem getirir (sadece taraflardan biri veya admin)
        {
            var transaction = _context.Transactions.Find(id);
            if (transaction == null) return NotFound("İşlem bulunamadı.");

            if (!User.IsInRole("Admin"))
            {
                var ownAccountIds = _context.Accounts.Where(a => a.UserId == CurrentUserId).Select(a => a.Id).ToList();
                if (!ownAccountIds.Contains(transaction.SenderAccountId) && !ownAccountIds.Contains(transaction.ReceiverAccountId))
                    return Forbid();
            }
            return Ok(transaction);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public IActionResult AddTransaction(Transaction transaction) // Yeni işlem ekler
        {
            _context.Transactions.Add(transaction);
            _context.SaveChanges();
            return Ok("İşlem başarıyla eklendi!");
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public IActionResult DeleteTransaction(int id) // İşlem siler
        {
            var transaction = _context.Transactions.Find(id);
            if (transaction == null) return NotFound("İşlem bulunamadı.");
            _context.Transactions.Remove(transaction);
            _context.SaveChanges();
            return Ok("İşlem silindi!");
        }

        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
