using System;

namespace Vireon.EntityLayer.Concrete
{
    public class LedgerEntry // Muhasebe defteri kayıtlarını tutan sınıf
    {
        public int Id { get; set; } // Defter kaydı kimliği
        public int AccountId { get; set; } // İşlem gören hesap
        public decimal Amount { get; set; } // İşlem miktarı
        public decimal PreviousBalance { get; set; } // İşlem öncesi bakiye
        public decimal NewBalance { get; set; } // İşlem sonrası yeni bakiye
        public string Description { get; set; } = null!; // İşlem açıklaması
        public DateTime CreatedAt { get; set; } // Kayıt oluşturulma tarihi

        public Account? Account { get; set; } // İlgili hesap nesnesi
    }

}
