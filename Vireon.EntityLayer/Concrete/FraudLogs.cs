using System;

namespace Vireon.EntityLayer.Concrete
{
    public class FraudLog
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public string RiskType { get; set; }
        public string Description { get; set; }
        public DateTime LogDate { get; set; }

        public Account? Account { get; set; }
    }
}
