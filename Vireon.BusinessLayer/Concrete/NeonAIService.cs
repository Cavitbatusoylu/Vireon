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
        public string ModelId { get; set; } = "llama-3.1-8b-instant";
    }

    public class NeonAIService
    {
        private readonly HttpClient _httpClient;
        private readonly IOptions<NeonAIOptions> _options;

        // Bankacılık konuşma veritabanı (Offline fallback)
        private static readonly Dictionary<string, string[]> _offlineResponses = new(StringComparer.OrdinalIgnoreCase)
        {
            { "merhaba", new[] {
                "Merhaba! Ben Neon, Vireon bankacılık asistanınız. Size nasıl yardımcı olabilirim? 💳",
                "Hoş geldiniz! Hesap bilgileri, transfer veya limit konularında yardımcı olabilirim.",
                "Merhaba! Vireon dijital bankacılık sistemine hoş geldiniz. Bugün ne yapmak istersiniz?"
            }},
            { "bakiye", new[] {
                "Bakiyenizi Dashboard > Genel Bakış sayfasından görebilirsiniz. Sol menüdeki 📊 simgesine tıklayın.",
                "Hesap bakiyeniz ana panelde en üstte gösterilmektedir. Güncel bakiye bilgisi için sayfayı yenileyebilirsiniz."
            }},
            { "transfer", new[] {
                "Para göndermek için sol menüden 💸 Para Gönder sekmesine gidin. Alıcı hesap numarası (VR-XXXXX) ve tutarı girin.",
                "Transfer işlemi ACID uyumlu olarak gerçekleşir. Günlük limitinizi aşmamaya dikkat edin. Limitleri ⚡ sekmesinden görebilirsiniz."
            }},
            { "limit", new[] {
                "Günlük transfer limitiniz varsayılan olarak 50.000₺'dir. ⚡ Günlük Limitler sekmesinden düzenleyebilirsiniz.",
                "Limit bilgilerinizi sol menüdeki 'Günlük Limitler' bölümünden kontrol edebilirsiniz. Kullanılan ve kalan limitiniz burada gösterilir."
            }},
            { "hesap", new[] {
                "Hesap bilgilerinizi 📋 Hesap Bilgileri sekmesinden detaylı olarak görebilirsiniz.",
                "Yeni hesap açmak için kayıt formunu kullanabilirsiniz. Her kullanıcıya otomatik VR-XXXXX formatında hesap numarası atanır."
            }},
            { "güvenlik", new[] {
                "Vireon şifrelerinizi BCrypt ile hash'leyerek korur. Fraud Detection sistemi şüpheli işlemleri otomatik tespit eder.",
                "Güvenlik önlemlerimiz: BCrypt şifreleme, ACID transaction'lar, Fraud analizi ve ML.NET tabanlı risk puanlama sistemi."
            }},
            { "yardım", new[] {
                "Size yardımcı olabileceğim konular:\n• 💰 Bakiye sorgulama\n• 💸 Para transferi\n• ⚡ Limit bilgileri\n• 📋 Hesap detayları\n• 🔐 Güvenlik\n• 📊 İşlem geçmişi",
                "Neon AI olarak bankacılık işlemlerinizde rehberlik edebilirim. Bir konu seçin veya sorunuzu doğrudan yazın!"
            }},
            { "fraud", new[] {
                "Vireon, kural tabanlı ve ML.NET destekli yapay zeka ile şüpheli işlemleri otomatik olarak tespit eder. Yüksek tutarlı veya sık tekrarlayan işlemler FraudLogs tablosuna kaydedilir.",
                "Fraud Detection sistemimiz her transferi analiz eder. %70 üzeri risk puanı alan işlemler otomatik olarak engellenir."
            }}
        };

        public NeonAIService(HttpClient httpClient, IOptions<NeonAIOptions> options)
        {
            _httpClient = httpClient;
            _options = options;
            _httpClient.Timeout = TimeSpan.FromMinutes(2);
        }

        public async Task<string> GetResponseAsync(string message)
        {
            var opt = _options.Value;
            
            // API key yoksa veya geçersizse offline yanıt ver
            if (string.IsNullOrWhiteSpace(opt.ApiToken) || opt.ApiToken.Length < 10)
                return GetOfflineResponse(message);

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
                using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opt.ApiToken.Trim());
                req.Content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(req);
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    // API hatası varsa offline fallback
                    return GetOfflineResponse(message);
                }

                return ParseResponse(body) ?? GetOfflineResponse(message);
            }
            catch (Exception)
            {
                // Bağlantı hatası durumunda da offline yanıt ver
                return GetOfflineResponse(message);
            }
        }

        private static string GetOfflineResponse(string message)
        {
            var lower = message.ToLowerInvariant();
            
            foreach (var kvp in _offlineResponses)
            {
                if (lower.Contains(kvp.Key))
                {
                    var responses = kvp.Value;
                    return responses[Random.Shared.Next(responses.Length)];
                }
            }

            // Genel fallback
            var generalResponses = new[]
            {
                $"Anladım, \"{message}\" hakkında bilgi istiyorsunuz. Vireon bankacılık sistemi olarak size hesap yönetimi, para transferi, limit ayarları ve güvenlik konularında yardımcı olabilirim. Daha spesifik bir soru sormak ister misiniz?",
                "Bu konuda size yardımcı olmak isterim! Vireon panelinizdeki sol menüden ilgili bölüme giderek işleminizi gerçekleştirebilirsiniz. Detaylı yardım için 'yardım' yazabilirsiniz.",
                "Neon AI olarak şu an offline modda çalışıyorum. Temel bankacılık sorularınızı yanıtlayabilirim: bakiye, transfer, limit, hesap, güvenlik gibi konularda soru sorabilirsiniz! 🤖"
            };

            return generalResponses[Random.Shared.Next(generalResponses.Length)];
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
    }
}
