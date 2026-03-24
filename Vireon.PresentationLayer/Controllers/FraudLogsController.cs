using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FraudLogsController : ControllerBase
    {
        private readonly VireonContext _context;

        public FraudLogsController(VireonContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetFraudLogs()
        {
            var values = _context.FraudLogs.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddFraudLog(FraudLog fraudLog)
        {
            _context.FraudLogs.Add(fraudLog);
            _context.SaveChanges();
            return Ok("Fraud log başarıyla eklendi!");
        }
    }
}
