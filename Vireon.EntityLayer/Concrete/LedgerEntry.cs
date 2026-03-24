using System;

namespace Vireon.EntityLayer.Concrete
{
    public class LedgerEntry
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public decimal Amount { get; set; }
        public decimal PreviousBalance { get; set; }
        public decimal NewBalance { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }

        public Account? Account { get; set; }
    }
}
