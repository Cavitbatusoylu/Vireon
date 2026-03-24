using System.Collections.Generic;

namespace Vireon.EntityLayer.Concrete
{
    public class Account
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string AccountNumber { get; set; }
        public decimal Balance { get; set; }
        public string Currency { get; set; }

        // Navigation Properties
        public User? User { get; set; }
        public List<Transaction>? SentTransactions { get; set; }
        public List<Transaction>? ReceivedTransactions { get; set; }
        public List<FraudLog>? FraudLogs { get; set; }
        public List<LedgerEntry>? LedgerEntries { get; set; }
    }
}
