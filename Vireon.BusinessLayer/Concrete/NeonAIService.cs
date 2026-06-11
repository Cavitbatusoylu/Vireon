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
                "Para transferi için sol menüdeki Finans bölümünden Para Gönder sekmesini kullanabilirsiniz. Yatırmak için Para Yatır sekmesine göz atın.",
                "Finans menüsündeki Para Gönder ve Para Yatır seçenekleriyle işlemlerinizi yönetebilirsiniz. Hangi işlemi yapmak istersiniz?"
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
                "Güvenlik önlemlerimiz: BCrypt şifreleme, ACID transaction'lar, Fraud analizi ve kural tabanlı risk puanlama sistemi."
            }},
            { "yardım", new[] {
                "Size şu konularda yardımcı olabilirim:\n" +
                "• Bakiye Sorgulama: Mevcut bakiyenizi Genel Bakış sayfasından görebilirsiniz.\n" +
                "• Para Transferi: Finans menüsünden VR-XXXX formatlı hesaplara gönderim yapabilirsiniz.\n" +
                "• Günlük Limitler: Transfer limitlerinizi kontrol edebilir ve güncelleyebilirsiniz.\n" +
                "• İşlem Geçmişi: Tüm hesap hareketlerinizi İşlem Geçmişi sayfasından takip edebilirsiniz.\n" +
                "• Güvenlik: Şüpheli işlemlerin nasıl engellendiğini öğrenebilirsiniz.\n" +
                "• Hesap Detayları: Hesap numaranızı Hesap Bilgileri sayfasından görüntüleyebilirsiniz.\n" +
                "Hangi konuda daha fazla bilgi istersiniz?"
            }},
            { "nasilsin", new[] {
                "Çok iyiyim! Bir yapay zeka asistanı olarak her zaman yardıma hazırım. Sizin için neler yapabilirim?",
                "Sistemlerim sorunsuz çalışıyor, harikayım! Sizin gününüz nasıl geçiyor?"
            }},
            { "fraud", new[] {
                "Vireon, kural tabanlı yapay zeka risk motoru ile şüpheli işlemleri otomatik olarak tespit eder. Yüksek tutarlı veya sık tekrarlayan işlemler FraudLogs tablosuna kaydedilir.",
                "Fraud Detection sistemimiz her transferi analiz eder. %70 üzeri risk puanı alan işlemler otomatik olarak engellenir."
            }}
        };

        // İngilizce bankacılık konuşma veritabanı (Offline fallback)
        private static readonly Dictionary<string, string[]> _offlineResponsesEn = new(StringComparer.OrdinalIgnoreCase)
        {
            { "hello", new[] {
                "Hi! I'm Neon, your Vireon banking assistant. How can I help you today? 💳",
                "Welcome! I can help with account info, transfers, or limits.",
                "Hello! Welcome to the Vireon digital banking system. What would you like to do?"
            }},
            { "balance", new[] {
                "You can view your balance on the Dashboard > Overview page. Click the 📊 icon in the left menu.",
                "Your account balance is shown at the top of the main panel. Refresh the page for the latest figure."
            }},
            { "transfer", new[] {
                "To send money, go to 💸 Send Money in the left menu. Enter the receiver account number (VR-XXXXX) and the amount.",
                "Transfers are ACID-compliant. Mind your daily limit — you can review it under the ⚡ section."
            }},
            { "limit", new[] {
                "Your default daily transfer limit is 50,000₺. You can adjust it under ⚡ Daily Limits.",
                "You can check your limits in the 'Daily Limits' section of the left menu — used and remaining limits are shown there."
            }},
            { "account", new[] {
                "You can see your account details under 📋 Account Information.",
                "To open a new account, use the registration form. Each user is assigned a VR-XXXXX account number automatically."
            }},
            { "security", new[] {
                "Vireon protects your passwords with BCrypt hashing. The fraud detection system flags suspicious transactions automatically.",
                "Our security measures: BCrypt encryption, ACID transactions, fraud analysis and a rule-based risk scoring system."
            }},
            { "help", new[] {
                "I can help you with:\n" +
                "• Balance inquiries on the Overview page\n" +
                "• Money transfers via Send Money\n" +
                "• Daily limit info under Daily Limits\n" +
                "• Account details under Account Information\n" +
                "• Security and transaction history\n" +
                "Which topic would you like to explore?"
            }},
            { "fraud", new[] {
                "Vireon uses a rule-based AI risk engine to detect suspicious transactions automatically. High-value or frequent transactions are logged to FraudLogs.",
                "Our fraud detection analyzes every transfer. Transactions scoring above 70% risk are blocked automatically."
            }}
        };

        public NeonAIService(HttpClient httpClient, IOptions<NeonAIOptions> options)
        {
            _httpClient = httpClient;
            _options = options;
            _httpClient.Timeout = TimeSpan.FromMinutes(2);
        }

        public async Task<string> GetResponseAsync(string message, List<ChatMessage>? history = null, string? lang = null)
        {
            var isEnglish = string.Equals(lang, "en", StringComparison.OrdinalIgnoreCase);
            var opt = _options.Value;

            // API key yoksa veya geçersizse offline yanıt ver
            if (string.IsNullOrWhiteSpace(opt.ApiToken) || opt.ApiToken.Length < 10)
                return GetOfflineResponse(message, isEnglish);

            try
            {
                var systemPrompt = isEnglish
                    ? "You are Neon, the AI assistant of Vireon digital bank. Always reply in English. Help with banking, money transfers, account operations and financial topics. Keep answers short, clear and professional. Remember the conversation history and answer accordingly."
                    : "Sen Vireon dijital bankasının yapay zeka asistanı Neon'sun. Türkçe yanıt ver. Bankacılık, para transferi, hesap işlemleri ve finansal konularda yardımcı ol. Kısa, net ve profesyonel yanıtlar ver. Sohbet geçmişini hatırla ve buna göre yanıt ver.";

                var messages = new List<object>
                {
                    new { role = "system", content = systemPrompt }
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
                    return GetOfflineResponse(message, isEnglish);
                }

                return ParseResponse(body) ?? GetOfflineResponse(message, isEnglish);
            }
            catch (Exception)
            {
                // Bağlantı hatası durumunda da offline yanıt ver
                return GetOfflineResponse(message, isEnglish);
            }
        }

        private static string GetOfflineResponse(string message, bool isEnglish)
        {
            var lower = NormalizeForMatch(message);
            var dictionary = isEnglish ? _offlineResponsesEn : _offlineResponses;

            foreach (var kvp in dictionary.OrderByDescending(k => k.Key.Length))
            {
                var key = isEnglish ? kvp.Key.ToLowerInvariant() : NormalizeForMatch(kvp.Key);
                if (lower.Contains(key))
                {
                    var responses = kvp.Value;
                    return responses[Random.Shared.Next(responses.Length)];
                }
            }

            if (isEnglish)
            {
                var generalEn = new[]
                {
                    $"I see you'd like to know about \"{message}\". As the Vireon banking system, I can help with account management, money transfers, limit settings and security. Would you like to ask something more specific?",
                    "I'd be happy to help! Use the left menu in your Vireon panel to reach the relevant section. Type 'help' for detailed assistance.",
                    "I'm currently running in offline mode. I can answer basic banking questions: balance, transfer, limit, account, security and more! 🤖"
                };
                return generalEn[Random.Shared.Next(generalEn.Length)];
            }

            // Genel fallback (TR)
            var generalResponses = new[]
            {
                "Anladım. Tam olarak ne yapmak istediğinizi söylerseniz size daha iyi rehberlik edebilirim. Örneğin: 'Para göndermek istiyorum' veya 'Bakiyem ne kadar?'",
                "Bu konuda henüz detaylı bilgim yok ama size temel bankacılık işlemlerinde (transfer, limit, bakiye) kesinlikle yardımcı olabilirim! 🚀",
                "Neon AI olarak her zaman yanınızdayım! Eğer bir sorunuz varsa 'yardım' yazarak neler yapabileceğimi listeleyebilirim.",
                "Söylediğinizi tam kavrayamadım ama Vireon panelindeki menüleri kullanarak çoğu işleminizi kolayca yapabilirsiniz. Başka bir sorunuz var mı?"
            };

            return generalResponses[Random.Shared.Next(generalResponses.Length)];
        }

        private static string NormalizeForMatch(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            return input.ToLowerInvariant()
                .Replace('ı', 'i')
                .Replace('ş', 's')
                .Replace('ğ', 'g')
                .Replace('ü', 'u')
                .Replace('ö', 'o')
                .Replace('ç', 'c');
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

    public class ChatMessage
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}
