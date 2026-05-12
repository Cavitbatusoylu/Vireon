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
                "Hoş geldiniz! Bugün bankacılık işlemlerinizde size eşlik etmekten mutluluk duyarım.",
                "Selam! Vireon'un akıllı dünyasına hoş geldiniz. Ne yapmak istersiniz?"
            }},
            { "selam", new[] { "Selam! Size nasıl yardımcı olabilirim?", "Merhaba! Ben Neon, bankacılık asistanınız." }},
            { "naber", new[] { "İyiyim, teşekkürler! Sizlere Vireon sisteminde yardımcı olmak için buradayım. Siz nasılsınız?", "Harikayım! Sistemler tıkır tıkır çalışıyor. Bugün size nasıl destek olabilirim?" }},
            { "nasılsın", new[] { "Çok iyiyim! Bir yapay zeka asistanı olarak her zaman yardıma hazırım. Sizin için neler yapabilirim?", "Sistemlerim %100 kapasiteyle çalışıyor, harikayım! Sizin gününüz nasıl geçiyor?" }},
            { "hey", new[] { "Hey! Buradayım. Ne sormak istemiştiniz?", "Dinliyorum! Bir işlemde yardıma mı ihtiyacınız var?" }},
            { "bakiye", new[] {
                "Bakiyenizi Dashboard > Genel Bakış sayfasından görebilirsiniz. Sol menüdeki 📊 simgesine tıklayın.",
                "Hesap bakiyeniz ana panelde en üstte gösterilmektedir. Güncel bakiye bilgisi için sayfayı yenileyebilirsiniz."
            }},
            { "para", new[] {
                "Para transferi yapmak için 'Para Gönder' sekmesini kullanabilirsiniz. Yatırmak için 'Para Yatır' sekmesine göz atın.",
                "Para işlemlerinizi sol menüdeki Finans kategorisinden yönetebilirsiniz. Hangi işlemi yapmak istersiniz?"
            }},
            { "transfer", new[] {
                "Para göndermek için sol menüden 💸 Para Gönder sekmesine gidin. Alıcı hesap numarası (VR-XXXXX) ve tutarı girin.",
                "Transfer işlemi ACID uyumlu olarak gerçekleşir. Günlük limitinizi aşmamaya dikkat edin. Limitleri ⚡ sekmesinden görebilirsiniz."
            }},
            { "gönder", new[] {
                "Para göndermek için 'Para Gönder' sayfasını kullanın. Alıcı hesap numarasını VR-XXXX formatında girmeyi unutmayın.",
                "Hemen para göndermek istiyorsanız sol menüdeki 💸 simgesine tıklayın!"
            }},
            { "yatır", new[] {
                "Para yatırmak için 'Para Yatır' sekmesine gidin. Demo modunda olduğumuz için tutar girmeniz yeterlidir.",
                "Bakiyenizi artırmak için sol menüdeki 💰 Para Yatır seçeneğini kullanabilirsiniz."
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
                "Size şu konularda detaylı yardımcı olabilirim:\n\n" +
                "• 💰 **Bakiye Sorgulama:** Mevcut bakiyenizi dashboard üzerinden anlık görebilirsiniz.\n" +
                "• 💸 **Para Transferi:** VR-XXXX formatlı hesaplara hızlı gönderim yapabilirsiniz.\n" +
                "• ⚡ **Günlük Limitler:** Transfer limitlerinizi kontrol edebilir ve güncelleyebilirsiniz.\n" +
                "• 📊 **İşlem Geçmişi:** Tüm hesap hareketlerinizi Ledger sayfasından takip edebilirsiniz.\n" +
                "• 🔐 **Güvenlik & Fraud:** Şüpheli işlemlerin nasıl engellendiğini öğrenebilirsiniz.\n" +
                "• 📋 **Hesap Detayları:** IBAN ve hesap numaranızı görüntüleyebilirsiniz.\n\n" +
                "Hangi konuda daha fazla bilgi istersiniz?"
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

        public async Task<string> GetResponseAsync(string message, List<ChatMessage>? history = null)
        {
            var opt = _options.Value;
            
            // API key yoksa veya geçersizse offline yanıt ver
            if (string.IsNullOrWhiteSpace(opt.ApiToken) || opt.ApiToken.Length < 10)
                return GetOfflineResponse(message);

            try
            {
                var messages = new List<object>
                {
                    new
                    {
                        role = "system",
                        content = "Sen Vireon dijital bankasının yapay zeka asistanı Neon'sun. Türkçe yanıt ver. Bankacılık, para transferi, hesap işlemleri ve finansal konularda yardımcı ol. Kısa, net ve profesyonel yanıtlar ver. Sohbet geçmişini hatırla ve buna göre yanıt ver."
                    }
                };

                // Geçmişi ekle (son 10 mesaj)
                if (history != null)
                {
                    foreach (var h in history.TakeLast(10))
                    {
                        messages.Add(new { role = h.Role, content = h.Content });
                    }
                }

                // Mevcut mesajı ekle
                messages.Add(new { role = "user", content = message });

                var requestBody = new
                {
                    model = opt.ModelId.Trim(),
                    messages = messages.ToArray(),
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

        public class ChatMessage
        {
            public string Role { get; set; } = "user";
            public string Content { get; set; } = "";
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
                "Anladım. Tam olarak ne yapmak istediğinizi söylerseniz size daha iyi rehberlik edebilirim. Örneğin: 'Para göndermek istiyorum' veya 'Bakiyem ne kadar?'",
                "Bu konuda henüz detaylı bilgim yok ama size temel bankacılık işlemlerinde (transfer, limit, bakiye) kesinlikle yardımcı olabilirim! 🚀",
                "Neon AI olarak her zaman yanınızdayım! Eğer bir sorunuz varsa 'yardım' yazarak neler yapabileceğimi listeleyebilirim.",
                "Söylediğinizi tam kavrayamadım ama Vireon panelindeki menüleri kullanarak çoğu işleminizi kolayca yapabilirsiniz. Başka bir sorunuz var mı?"
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
