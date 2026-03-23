using System;
namespace Vireon.EntityLayer.Concrete
{
    public class Transaction
    {
        public int Id { get; set; }
        public int SenderAccountId { get; set; }
        public int ReceiverAccountId { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }

        // Navigation Properties
        public Account SenderAccount { get; set; }
        public Account ReceiverAccount { get; set; }
    }
}
