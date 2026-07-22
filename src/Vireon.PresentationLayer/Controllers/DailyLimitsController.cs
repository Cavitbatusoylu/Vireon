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
    public class DailyLimitsController : ControllerBase // Günlük limit işlemlerini yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public DailyLimitsController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetDailyLimits() // Admin: tüm limitler, normal kullanıcı: sadece kendi limiti
        {
            if (User.IsInRole("Admin")) return Ok(_context.DailyLimits.ToList());
            return Ok(_context.DailyLimits.Where(l => l.UserId == CurrentUserId).ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetDailyLimit(int id) // ID ile günlük limit getirir (sadece sahibi veya admin)
        {
            var limit = _context.DailyLimits.Find(id);
            if (limit == null) return NotFound("Limit bulunamadı.");
            if (!User.IsInRole("Admin") && limit.UserId != CurrentUserId) return Forbid();
            return Ok(limit);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public IActionResult AddDailyLimit([FromBody] DailyLimit dailyLimit) // Yeni günlük limit ekler
        {
            _context.DailyLimits.Add(dailyLimit);
            _context.SaveChanges();
            return Ok("Günlük limit başarıyla eklendi!");
        }

        [HttpPut("{id}")]
        public IActionResult UpdateDailyLimit(int id, [FromBody] DailyLimit dailyLimit) // Limit günceller (sadece sahibi veya admin)
        {
            var existing = _context.DailyLimits.Find(id);
            if (existing == null) return NotFound("Limit bulunamadı.");
            if (!User.IsInRole("Admin") && existing.UserId != CurrentUserId) return Forbid();
            existing.MaxDailyLimit = dailyLimit.MaxDailyLimit;
            existing.UsedLimit = dailyLimit.UsedLimit;
            existing.LastResetDate = dailyLimit.LastResetDate;
            _context.SaveChanges();
            return Ok("Limit güncellendi!");
        }

        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
