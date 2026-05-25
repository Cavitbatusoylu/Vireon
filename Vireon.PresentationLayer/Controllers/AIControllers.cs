using Microsoft.AspNetCore.Mvc;
using Vireon.BusinessLayer.Concrete;
using Vireon.DtoLayer.DTOs;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AIController : ControllerBase
    {
        private readonly NeonAIService _neonAIService;

        public AIController(NeonAIService neonAIService)
        {
            _neonAIService = neonAIService;
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Message))
                return BadRequest(new { message = "Mesaj boş olamaz." });

            var result = await _neonAIService.GetResponseAsync(request.Message);
            return Ok(new { response = result });
        }
    }

}
