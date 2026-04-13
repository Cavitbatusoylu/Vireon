using Microsoft.AspNetCore.Mvc;
using Vireon.BusinessLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AIController : ControllerBase
    {
        private readonly KumruAIService _kumruAIService;

        public AIController(KumruAIService kumruAIService)
        {
            _kumruAIService = kumruAIService;
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Message))
            {
                return BadRequest(new { message = "Mesaj boş olamaz." });
            }

            var result = await _kumruAIService.GetKumruResponseAsync(request.Message);
            return Ok(new { response = result });
        }
    }

    public class ChatRequest
    {
        public string? Message { get; set; }
    }
}

