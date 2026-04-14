using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Vireon.BusinessLayer.Concrete
{
    public class NeonAIOptions
    {
        public string ApiToken { get; set; } = "";
        public string ModelId { get; set; } = "meta-llama/Llama-3.1-8B-Instruct";
    }

    public class NeonAIService
    {
        private readonly HttpClient _httpClient;
        private readonly IOptions<NeonAIOptions> _options;

        public NeonAIService(HttpClient httpClient, IOptions<NeonAIOptions> options)
        {
            _httpClient = httpClient;
            _options = options;
            _httpClient.Timeout = TimeSpan.FromMinutes(2);
        }

        public async Task<string> GetResponseAsync(string message)
        {
            var opt = _options.Value;
            if (string.IsNullOrWhiteSpace(opt.ApiToken))
                return "Neon AI yapılandırması eksik: API anahtarı ayarlanmamış.";

            try
            {
                var requestBody = new
                {
                    model = opt.ModelId.Trim(),
                    messages = new object[]
                    {
                        new
                        {
                            role = "system",
                            content = "Sen Vireon dijital bankasının yapay zeka asistanı Neon'sun. Türkçe yanıt ver. Bankacılık, para transferi, hesap işlemleri ve finansal konularda yardımcı ol. Kısa, net ve profesyonel yanıtlar ver."
                        },
                        new { role = "user", content = message }
                    },
                    max_tokens = 350,
                    temperature = 0.7
                };

                var json = JsonSerializer.Serialize(requestBody);
                using var req = new HttpRequestMessage(HttpMethod.Post, "https://router.huggingface.co/v1/chat/completions");
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opt.ApiToken.Trim());
                req.Content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(req);
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    return ParseError(body, response.StatusCode);

                return ParseResponse(body) ?? "Yanıt alınamadı.";
            }
            catch (Exception ex)
            {
                return $"Neon AI bağlantı hatası: {ex.Message}";
            }
        }

        private static string? ParseResponse(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                var choices = doc.RootElement.GetProperty("choices");
                if (choices.GetArrayLength() == 0) return null;
                return choices[0].GetProperty("message").GetProperty("content").GetString()?.Trim();
            }
            catch { return null; }
        }

        private static string ParseError(string body, HttpStatusCode status)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("error", out var err))
                {
                    if (err.ValueKind == JsonValueKind.String) return $"AI Hata: {err.GetString()}";
                    if (err.TryGetProperty("message", out var m)) return $"AI Hata: {m.GetString()}";
                }
            }
            catch { }
            return $"Neon AI yanıt vermedi ({(int)status}).";
        }
    }
}
