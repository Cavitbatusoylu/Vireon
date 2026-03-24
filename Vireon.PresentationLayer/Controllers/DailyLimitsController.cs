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

        public DailyLimitsController(VireonContext context) // Veritabanı bağlamını enjekte eder
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetDailyLimits() // Tüm günlük limitleri listeler
        {
            var values = _context.DailyLimits.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddDailyLimit(DailyLimit dailyLimit) // Sisteme yeni bir günlük limit ekler
        {
            _context.DailyLimits.Add(dailyLimit);
            _context.SaveChanges();
            return Ok("Günlük limit başarıyla eklendi!");
        }
    }

}
