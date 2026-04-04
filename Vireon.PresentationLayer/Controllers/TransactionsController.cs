using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionsController : ControllerBase // Para transferlerini yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public TransactionsController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetTransactions() // Tüm işlemleri listeler
        {
            return Ok(_context.Transactions.ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetTransaction(int id) // ID ile işlem getirir
        {
            var transaction = _context.Transactions.Find(id);
            if (transaction == null) return NotFound("İşlem bulunamadı.");
            return Ok(transaction);
        }

        [HttpPost]
        public IActionResult AddTransaction(Transaction transaction) // Yeni işlem ekler
        {
            _context.Transactions.Add(transaction);
            _context.SaveChanges();
            return Ok("İşlem başarıyla eklendi!");
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteTransaction(int id) // İşlem siler
        {
            var transaction = _context.Transactions.Find(id);
            if (transaction == null) return NotFound("İşlem bulunamadı.");
            _context.Transactions.Remove(transaction);
            _context.SaveChanges();
            return Ok("İşlem silindi!");
        }
    }
}
