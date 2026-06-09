using Vireon.EntityLayer.Concrete;

namespace Vireon.BusinessLayer.Abstract
{
    public interface ITransactionService
    {
        void ProcessTransaction(Transaction transaction);
        Account? GetAccountByNumber(string accountNumber);
        void Deposit(string accountNumber, decimal amount, string? description);
        decimal ConvertCurrency(decimal amount, string fromCurrency, string toCurrency);
        int GetRecentTransactionCount(int accountId, int minutes);
        void LogFraudEvent(int accountId, string riskType, string description);
    }
}  
