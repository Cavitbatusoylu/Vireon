using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LedgerEntriesController : ControllerBase
    {
        private readonly VireonContext _context;

        public LedgerEntriesController(VireonContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetLedgerEntries()
        {
            var values = _context.LedgerEntries.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddLedgerEntry(LedgerEntry ledgerEntry)
        {
            _context.LedgerEntries.Add(ledgerEntry);
            _context.SaveChanges();
            return Ok("Muhasebe kaydı başarıyla eklendi!");
        }
    }
}
