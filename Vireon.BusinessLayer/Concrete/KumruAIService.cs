using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Vireon.BusinessLayer.Concrete
{
    public class KumruOptions
    {
        public string ApiToken { get; set; } = "";
        // Sadece Kumru modeline odaklanıyoruz
        public string ModelId { get; set; } = "vngrs-ai/Kumru";
    }

    /// <summary>
    /// Vireon Özel Yapay Zeka Servisi: Kumru LLM Entegrasyonu.
    /// Sadece belirtilen Kumru modelini kullanarak yanıt üretir.
    /// </summary>
    public class KumruAIService
    {
        private readonly HttpClient _httpClient;
        private readonly IOptions<KumruOptions> _options;

        public KumruAIService(HttpClient httpClient, IOptions<KumruOptions> options)
        {
            _httpClient = httpClient;
            _options = options;
            _httpClient.Timeout = TimeSpan.FromMinutes(2);
        }

        public async Task<string> GetKumruResponseAsync(string message)
        {
            var opt = _options.Value;
            if (string.IsNullOrWhiteSpace(opt.ApiToken))
            {
                return "NEON AI (Kumru) yapılandırması eksik: API anahtarı ayarlanmamış.";
            }

            var token = opt.ApiToken.Trim();
            var model = opt.ModelId.Trim();

            try
            {
                // Sadece Kumru modelini deniyoruz
                var (ok, text, body, status) = await TryKumruChatAsync(message, token, model);

                if (ok && !string.IsNullOrWhiteSpace(text))
                    return text.Trim();

                return DescribeKumruError(body, status);
            }
            catch (Exception ex)
            {
                return $"Kumru bağlantı hatası: {ex.Message}";
            }
        }

        private async Task<(bool Ok, string? Text, string Body, HttpStatusCode Status)> TryKumruChatAsync(
            string message, string token, string model)
        {
            var requestBody = new
            {
                model,
                messages = new object[]
                {
                    new
                    {
                        role = "system",
                        content = "Sen Vireon dijital banka asistanı Neon'sun. Kumru dil modelini kullanıyorsun. Kısa ve net yanıtlar ver."
                    },
                    new { role = "user", content = message }
                },
                max_tokens = 350,
                temperature = 0.7
            };

            var json = JsonSerializer.Serialize(requestBody);
            const string apiUrl = "https://router.huggingface.co/v1/chat/completions";

            using var req = new HttpRequestMessage(HttpMethod.Post, apiUrl);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(req);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return (false, null, body, response.StatusCode);

            var text = ParseKumruResponse(body);
            return (true, text, body, response.StatusCode);
        }

        private static string? ParseKumruResponse(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (!root.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
                    return null;

                return choices[0].GetProperty("message").GetProperty("content").GetString();
            }
            catch
            {
                return null;
            }
        }

        private static string DescribeKumruError(string body, HttpStatusCode status)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("error", out var err))
                {
                    if (err.ValueKind == JsonValueKind.String) return $"AI Error: {err.GetString()}";
                    if (err.TryGetProperty("message", out var m)) return $"AI Error: {m.GetString()}";
                }
            }
            catch { }

            return $"Kumru AI Yanıt Vermedi ({(int)status}). Lütfen API anahtarını ve model durumunu kontrol edin.";
        }
    }
}
