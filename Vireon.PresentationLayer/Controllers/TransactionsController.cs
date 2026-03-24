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

        public TransactionsController(VireonContext context) // Veritabanı bağlamını enjekte eder
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetTransactions() // Sisteme kayıtlı tüm işlemleri listeler
        {
            var values = _context.Transactions.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddTransaction(Transaction transaction) // Sisteme yeni bir işlem ekler
        {
            _context.Transactions.Add(transaction);
            _context.SaveChanges();
            return Ok("İşlem başarıyla eklendi!");
        }
    }

}
