using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DailyLimitsController : ControllerBase // Günlük limit işlemlerini yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public DailyLimitsController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetDailyLimits() // Tüm günlük limitleri listeler
        {
            return Ok(_context.DailyLimits.ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetDailyLimit(int id) // ID ile günlük limit getirir
        {
            var limit = _context.DailyLimits.Find(id);
            if (limit == null) return NotFound("Limit bulunamadı.");
            return Ok(limit);
        }

        [HttpPost]
        public IActionResult AddDailyLimit([FromBody] DailyLimit dailyLimit) // Yeni günlük limit ekler
        {
            _context.DailyLimits.Add(dailyLimit);
            _context.SaveChanges();
            return Ok("Günlük limit başarıyla eklendi!");
        }

        [HttpPut("{id}")]
        public IActionResult UpdateDailyLimit(int id, [FromBody] DailyLimit dailyLimit) // Limit günceller
        {
            var existing = _context.DailyLimits.Find(id);
            if (existing == null) return NotFound("Limit bulunamadı.");
            existing.MaxDailyLimit = dailyLimit.MaxDailyLimit;
            existing.UsedLimit = dailyLimit.UsedLimit;
            existing.LastResetDate = dailyLimit.LastResetDate;
            _context.SaveChanges();
            return Ok("Limit güncellendi!");
        }
    }
}
