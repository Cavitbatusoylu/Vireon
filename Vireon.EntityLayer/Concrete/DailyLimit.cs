using System;
namespace Vireon.EntityLayer.Concrete
{
    public class DailyLimit
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public decimal MaxDailyLimit { get; set; }
        public decimal UsedLimit { get; set; }
        public DateTime LastResetDate { get; set; }


        public User User { get; set; }
    }
}
