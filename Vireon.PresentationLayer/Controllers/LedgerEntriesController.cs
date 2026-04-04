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

        public LedgerEntriesController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetLedgerEntries() // Tüm muhasebe kayıtlarını listeler
        {
            return Ok(_context.LedgerEntries.ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetLedgerEntry(int id) // ID ile muhasebe kaydı getirir
        {
            var entry = _context.LedgerEntries.Find(id);
            if (entry == null) return NotFound("Kayıt bulunamadı.");
            return Ok(entry);
        }

        [HttpPost]
        public IActionResult AddLedgerEntry(LedgerEntry ledgerEntry) // Yeni muhasebe kaydı ekler (Immutable - sadece eklenir, silinemez)
        {
            _context.LedgerEntries.Add(ledgerEntry);
            _context.SaveChanges();
            return Ok("Muhasebe kaydı başarıyla eklendi!");
        }
    }
}
