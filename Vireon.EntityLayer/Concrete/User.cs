using System;
using System.Collections.Generic;
namespace Vireon.EntityLayer.Concrete
{
    public class User // Sistemdeki kullanıcı bilgilerini tutan sınıf
    {
        public int Id { get; set; } // Kullanıcı kimliği
        public string Name { get; set; } = null!; // Kullanıcı adı
        public string Surname { get; set; } = null!; // Kullanıcı soyadı
        public string Email { get; set; } = null!; // E-posta adresi
        public string Password { get; set; } = null!; // Giriş şifresi
        public string AccountNumber { get; set; } = null!; // Benzersiz hesap numarası (VR-XXXX)
        public DateTime CreatedAt { get; set; } = DateTime.Now; // Kayıt tarihi

        // Navigation Properties (İlişkili Tablolar)
        public List<Account>? Accounts { get; set; } // Kullanıcıya ait hesaplar
        public DailyLimit? DailyLimit { get; set; } // Kullanıcının günlük işlem limiti
    }

}
