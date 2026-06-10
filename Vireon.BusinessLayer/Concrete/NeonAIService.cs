using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Vireon.DtoLayer.DTOs;

namespace Vireon.BusinessLayer.Concrete
{
    public class NeonAIOptions
    {
        public string ApiToken { get; set; } = string.Empty;
        public string ModelId { get; set; } = "llama-3.1-8b-instant";
    }

    public class NeonAIService
    {
        private readonly HttpClient _httpClient;
        private readonly IOptions<NeonAIOptions> _options;

        // İnternet yoksa dönülecek standart cevaplar
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
            { "hi", new[] { "Hi! I'm Neon. How can I help with your banking today?", "Hello! Ask me about transfers, balance, limits or account info." }},
            { "hey", new[] { "Hey! I'm here. Need help with a transfer or your account?", "Hey! Tell me what you'd like to do — send money, check balance, or view limits." }},
            { "whats up", new[] { "All good here! I'm Neon, your Vireon assistant. Want to send money, check your balance, or review limits?", "Systems are running smoothly! How can I help with your banking today?" }},
            { "how are you", new[] { "I'm doing great and ready to help! What banking task can I assist with?", "All systems operational! Would you like help with a transfer or account info?" }},
            { "send money", new[] {
                "To send money, open 💸 Send Money in the left menu. Enter the receiver account (VR-XXXXX format) and the amount.",
                "Go to Finance → Send Money. Fill in the receiver account number and amount, then confirm the transfer."
            }},
            { "want to send", new[] {
                "Sure! Open 💸 Send Money from the left menu. You'll need the receiver's VR-XXXXX account number and the amount.",
                "To send money: left menu → Send Money → enter receiver account and amount → confirm."
            }},
            { "send", new[] {
                "To send money, use 💸 Send Money in the left menu. Enter the VR-XXXXX account number and amount.",
                "Open Send Money from the Finance section. Transfers are processed with ACID guarantees."
            }},
            { "money", new[] {
                "You can send money via 💸 Send Money or deposit via 💰 Deposit in the Finance menu.",
                "For transfers use Send Money; to add funds use Deposit. Both are in the left Finance section."
            }},
            { "pay", new[] {
                "To pay someone, use 💸 Send Money. Enter their VR-XXXXX account number and the amount.",
                "Payments are made through Send Money in the left menu. Make sure you have the correct account number."
            }},
            { "balance", new[] {
                "You can view your balance on the Dashboard > Overview page. Click the 📊 icon in the left menu.",
                "Your account balance is shown at the top of the main panel. Refresh the page for the latest figure."
            }},
            { "transfer", new[] {
                "To send money, go to 💸 Send Money in the left menu. Enter the receiver account number (VR-XXXXX) and the amount.",
                "Transfers are ACID-compliant. Mind your daily limit — you can review it under the ⚡ section."
            }},
            { "deposit", new[] {
                "To deposit funds, go to 💰 Deposit in the left menu. Enter the amount and confirm.",
                "Use the Deposit section under Finance to add money to your account."
            }},
            { "limit", new[] {
                "Your default daily transfer limit is 50,000₺. You can adjust it under ⚡ Daily Limits.",
                "You can check your limits in the 'Daily Limits' section of the left menu — used and remaining limits are shown there."
            }},
            { "account", new[] {
                "You can see your account details under 📋 Account Information.",
                "To open a new account, use the registration form. Each user is assigned a VR-XXXXX account number automatically."
            }},
            { "transaction", new[] {
                "View your transaction history in the 📜 Transaction History section of the left menu.",
                "All completed transfers and deposits are listed under Transaction History."
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
            }},
            { "thanks", new[] { "You're welcome! Let me know if you need anything else.", "Happy to help! I'm here for any other banking questions." }},
            { "thank you", new[] { "You're welcome! Anything else I can help with?", "Glad I could help! Ask anytime." }}
        };

        private static readonly string[] _englishHints =
        {
            "hello", "hi", "hey", "whats up", "how are you", "send", "money", "transfer", "balance",
            "account", "help", "deposit", "limit", "security", "want", "need", "pay", "please", "thank"
        };

        private static readonly string[] _turkishHints =
        {
            "merhaba", "selam", "naber", "nasilsin", "para", "gonder", "gönder", "bakiye", "hesap",
            "yardim", "yardım", "transfer", "limit", "yatir", "yatır", "istiyorum", "güvenlik", "guvenlik"
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
                return GetOfflineResponse(message, ResolveOfflineLanguage(message, isEnglish));

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
                    return GetOfflineResponse(message, ResolveOfflineLanguage(message, isEnglish));
                }

                return ParseResponse(body) ?? GetOfflineResponse(message, ResolveOfflineLanguage(message, isEnglish));
            }
            catch (Exception)
            {
                // Bağlantı hatası durumunda da offline yanıt ver
                return GetOfflineResponse(message, ResolveOfflineLanguage(message, isEnglish));
            }
        }

        private static bool ResolveOfflineLanguage(string message, bool uiIsEnglish)
        {
            var normalized = NormalizeForMatch(message);
            var enScore = _englishHints.Count(h => normalized.Contains(NormalizeForMatch(h)));
            var trScore = _turkishHints.Count(h => normalized.Contains(NormalizeForMatch(h)));
            if (enScore > trScore) return true;
            if (trScore > enScore) return false;
            return uiIsEnglish;
        }

        private static string GetOfflineResponse(string message, bool isEnglish)
        {
            var lower = NormalizeForMatch(message);
            var dictionary = isEnglish ? _offlineResponsesEn : _offlineResponses;

            foreach (var kvp in dictionary.OrderByDescending(k => k.Key.Length))
            {
                var key = NormalizeForMatch(kvp.Key);
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
                    "I didn't quite catch that. Try asking about: send money, balance, deposit, limits, account info, or type 'help' for a full list.",
                    "I'm here to help with Vireon banking! Ask me to send money, check your balance, view limits, or type 'help' for more options. 🤖",
                    "Could you be more specific? For example: 'I want to send money', 'What's my balance?', or 'Show daily limits'."
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

            var sb = new StringBuilder(input.Length);
            foreach (var c in input.ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(c) || char.IsWhiteSpace(c))
                    sb.Append(c);
            }

            return sb.ToString()
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
}
