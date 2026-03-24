using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionsController : ControllerBase
    {
        private readonly VireonContext _context;

        public TransactionsController(VireonContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetTransactions()
        {
            var values = _context.Transactions.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddTransaction(Transaction transaction)
        {
            _context.Transactions.Add(transaction);
            _context.SaveChanges();
            return Ok("İşlem başarıyla eklendi!");
        }
    }
}
