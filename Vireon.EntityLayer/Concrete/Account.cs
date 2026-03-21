using System.Collections.Generic;
using Vireon.EntityLayer.Abstract;

namespace Vireon.EntityLayer.Concrete
{
    public class Account : IEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string AccountNumber { get; set; }
        public decimal Balance { get; set; }
        public string Currency { get; set; }

        // Concurrency Control (Rapor - Madde 7.2)
        public byte[] RowVersion { get; set; }

        // Navigation Properties
        public User User { get; set; }
        public List<Transaction> SentTransactions { get; set; }
        public List<Transaction> ReceivedTransactions { get; set; }
        public List<FraudLog> FraudLogs { get; set; }
        public List<LedgerEntry> LedgerEntries { get; set; }
    }
}
