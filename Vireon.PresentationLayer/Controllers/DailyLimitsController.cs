using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DailyLimitsController : ControllerBase
    {
        private readonly VireonContext _context;

        public DailyLimitsController(VireonContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetDailyLimits()
        {
            var values = _context.DailyLimits.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddDailyLimit(DailyLimit dailyLimit)
        {
            _context.DailyLimits.Add(dailyLimit);
            _context.SaveChanges();
            return Ok("Günlük limit başarıyla eklendi!");
        }
    }
}
