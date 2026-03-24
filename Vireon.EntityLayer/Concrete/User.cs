using System.Collections.Generic;
namespace Vireon.EntityLayer.Concrete
{
    public class User // Sistemdeki kullanıcı bilgilerini tutan sınıf
    {
        public int Id { get; set; } // Kullanıcı kimliği
        public string Name { get; set; } // Kullanıcı adı
        public string Surname { get; set; } // Kullanıcı soyadı
        public string Email { get; set; } // E-posta adresi
        public string Password { get; set; } // Giriş şifresi

        // Navigation Properties (İlişkili Tablolar)
        public List<Account>? Accounts { get; set; } // Kullanıcıya ait hesaplar
        public DailyLimit? DailyLimit { get; set; } // Kullanıcının günlük işlem limiti
    }

}
