using Vireon.EntityLayer.Concrete;

namespace Vireon.BusinessLayer.Abstract
{
    public interface ITransactionService
    {
        // Vezneden gelen temiz veriyi alıp işleyecek olan ana metot
        void ProcessTransaction(Transaction transaction);
        Account? GetAccountByNumber(string accountNumber);
    }
}