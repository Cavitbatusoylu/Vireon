using System;
using Vireon.EntityLayer.Abstract;

namespace Vireon.EntityLayer.Concrete
{
    public class LedgerEntry : IEntity
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public decimal Amount { get; set; }
        public decimal PreviousBalance { get; set; }
        public decimal NewBalance { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }

        public Account Account { get; set; }
    }
}
