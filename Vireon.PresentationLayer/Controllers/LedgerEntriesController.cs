using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LedgerEntriesController : ControllerBase // Muhasebe kayıtlarını yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public LedgerEntriesController(VireonContext context) // Veritabanı bağlamını enjekte eder
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetLedgerEntries() // Tüm muhasebe kayıtlarını listeler
        {
            var values = _context.LedgerEntries.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddLedgerEntry(LedgerEntry ledgerEntry) // Yeni bir muhasebe kaydı ekler
        {
            _context.LedgerEntries.Add(ledgerEntry);
            _context.SaveChanges();
            return Ok("Muhasebe kaydı başarıyla eklendi!");
        }
    }

}
