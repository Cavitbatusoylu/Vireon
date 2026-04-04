using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FraudLogsController : ControllerBase // Şüpheli işlem kayıtlarını yöneten API denetleyicisi
    {
        private readonly VireonContext _context;

        public FraudLogsController(VireonContext context) { _context = context; }

        [HttpGet]
        public IActionResult GetFraudLogs() // Tüm fraud kayıtlarını listeler
        {
            return Ok(_context.FraudLogs.ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetFraudLog(int id) // ID ile fraud kaydı getirir
        {
            var log = _context.FraudLogs.Find(id);
            if (log == null) return NotFound("Kayıt bulunamadı.");
            return Ok(log);
        }

        [HttpPost]
        public IActionResult AddFraudLog(FraudLog fraudLog) // Yeni fraud kaydı ekler
        {
            _context.FraudLogs.Add(fraudLog);
            _context.SaveChanges();
            return Ok("Fraud log başarıyla eklendi!");
        }
    }
}
