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
    public class LedgerEntriesController : ControllerBase // Muhasebe kayıtlarını yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public LedgerEntriesController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetLedgerEntries() // Admin: tüm kayıtlar, normal kullanıcı: sadece kendi hesaplarına ait kayıtlar
        {
            if (User.IsInRole("Admin")) return Ok(_context.LedgerEntries.ToList());

            var ownAccountIds = _context.Accounts.Where(a => a.UserId == CurrentUserId).Select(a => a.Id).ToList();
            return Ok(_context.LedgerEntries.Where(l => ownAccountIds.Contains(l.AccountId)).ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetLedgerEntry(int id) // ID ile muhasebe kaydı getirir (sadece hesap sahibi veya admin)
        {
            var entry = _context.LedgerEntries.Find(id);
            if (entry == null) return NotFound("Kayıt bulunamadı.");

            if (!User.IsInRole("Admin"))
            {
                var owns = _context.Accounts.Any(a => a.Id == entry.AccountId && a.UserId == CurrentUserId);
                if (!owns) return Forbid();
            }
            return Ok(entry);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public IActionResult AddLedgerEntry(LedgerEntry ledgerEntry) // Yeni muhasebe kaydı ekler (Immutable - sadece eklenir, silinemez)
        {
            _context.LedgerEntries.Add(ledgerEntry);
            _context.SaveChanges();
            return Ok("Muhasebe kaydı başarıyla eklendi!");
        }

        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
