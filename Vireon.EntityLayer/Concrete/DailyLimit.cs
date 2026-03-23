using System;
using Vireon.EntityLayer.Abstract;

namespace Vireon.EntityLayer.Concrete
{
    public class DailyLimit : IEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public decimal MaxDailyLimit { get; set; }
        public decimal UsedLimit { get; set; }
        public DateTime LastResetDate { get; set; }


        public User User { get; set; }
    }
}
