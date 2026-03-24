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

        public FraudLogsController(VireonContext context) // Veritabanı bağlamını enjekte eder
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetFraudLogs() // Tüm şüpheli işlem kayıtlarını listeler
        {
            var values = _context.FraudLogs.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddFraudLog(FraudLog fraudLog) // Yeni bir şüpheli işlem kaydı oluşturur
        {
            _context.FraudLogs.Add(fraudLog);
            _context.SaveChanges();
            return Ok("Fraud log başarıyla eklendi!");
        }
    }

}
