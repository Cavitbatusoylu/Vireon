using System.Collections.Generic;

namespace Vireon.EntityLayer.Concrete
{
    public class Account // Hesap bilgilerini tutan sınıf
    {
        public int Id { get; set; } // Benzersiz hesap kimliği
        public int UserId { get; set; } // Hesabın ait olduğu kullanıcı kimliği
        public string AccountNumber { get; set; } // Hesap numarası
        public decimal Balance { get; set; } // Hesap bakiyesi
        public string Currency { get; set; } // Hesap para birimi

        // Navigation Properties (İlişkili Tablolar)
        public User? User { get; set; } // Hesabın sahibi
        public List<Transaction>? SentTransactions { get; set; } // Gönderilen para transferleri
        public List<Transaction>? ReceivedTransactions { get; set; } // Gelen para transferleri
        public List<FraudLog>? FraudLogs { get; set; } // Dolandırıcılık bildirimleri
        public List<LedgerEntry>? LedgerEntries { get; set; } // Muhasebe kayıtları
    }

}
