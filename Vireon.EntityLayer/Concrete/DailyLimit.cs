using System;
namespace Vireon.EntityLayer.Concrete
{
    public class DailyLimit // Günlük işlem limitlerini tutan sınıf
    {
        public int Id { get; set; } // Limit kaydı kimliği
        public int UserId { get; set; } // Limitlerin ait olduğu kullanıcı
        public decimal MaxDailyLimit { get; set; } // Maksimum günlük limit miktarı
        public decimal UsedLimit { get; set; } // Gün içerisinde kullanılan miktar
        public DateTime LastResetDate { get; set; } // Limitlerin son sıfırlanma tarihi


        public User? User { get; set; } // İlişkili kullanıcı
    }

}
