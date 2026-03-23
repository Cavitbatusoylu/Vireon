using System.Collections.Generic;
namespace Vireon.EntityLayer.Concrete
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Surname { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }

        // Navigation Properties
        public List<Account> Accounts { get; set; }
        public DailyLimit DailyLimit { get; set; } // Bir kullanıcının bir limiti olur
    }
}
