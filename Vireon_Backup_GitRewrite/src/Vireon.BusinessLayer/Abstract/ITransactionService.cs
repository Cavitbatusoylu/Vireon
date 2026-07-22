using Vireon.EntityLayer.Concrete;

namespace Vireon.BusinessLayer.Abstract
{
    public interface ITransactionService
    {
        void ProcessTransaction(Transaction transaction);
        Account? GetAccountByNumber(string accountNumber);
        Account? GetAccountById(int accountId);
        void Deposit(string accountNumber, decimal amount, string? description);
        int GetRecentTransactionCount(int accountId, int minutes);
        decimal ConvertCurrency(decimal amount, string fromCurrency, string toCurrency);
    }
}
