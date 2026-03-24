using System;

namespace Vireon.EntityLayer.Concrete
{
    public class FraudLog // Şüpheli işlem kayıtlarını tutan sınıf
    {
        public int Id { get; set; } // Kayıt kimliği
        public int AccountId { get; set; } // Riskli hesabın kimliği
        public string RiskType { get; set; } // Risk türü (Şüpheli giriş, Yüksek miktar vb.)
        public string Description { get; set; } // Risk detayı
        public DateTime LogDate { get; set; } // Kayıt tarihi

        public Account? Account { get; set; } // Riskli hesap nesnesi
    }

}
