using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Vireon.BusinessLayer.Abstract;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.BusinessLayer.Concrete
{
    public class TransactionManager : ITransactionService
    {
        private readonly VireonContext _context;
        private readonly ILogger<TransactionManager> _logger;

        public TransactionManager(VireonContext context, ILogger<TransactionManager> logger)
        {
            _context = context;
            _logger = logger;
        }

        public void ProcessTransaction(Transaction transaction)
        {
            // İşlem durumunu "pending" olarak başlat
            transaction.Status = "pending";

            using var dbTransaction = _context.Database.BeginTransaction(System.Data.IsolationLevel.Serializable);
            try
            {
                // 1. Hesapları yükle
                var senderAccount = _context.Accounts.FirstOrDefault(a => a.Id == transaction.SenderAccountId);
                var receiverAccount = _context.Accounts.FirstOrDefault(a => a.Id == transaction.ReceiverAccountId);

                if (senderAccount == null || receiverAccount == null)
                {
                    transaction.Status = "failed";
                    throw new InvalidOperationException("Gönderici veya alıcı hesap bulunamadı.");
                }

                // 2. İş kuralları
                if (transaction.SenderAccountId == transaction.ReceiverAccountId)
                {
                    transaction.Status = "failed";
                    throw new InvalidOperationException("Kendi hesabınıza transfer yapamazsınız.");
                }

                if (transaction.Amount <= 0)
                {
                    transaction.Status = "failed";
                    throw new InvalidOperationException("Transfer miktarı 0'dan büyük olmalıdır.");
                }

                if (senderAccount.Balance < transaction.Amount)
                {
                    transaction.Status = "failed";
                    throw new InvalidOperationException("Yetersiz bakiye.");
                }

                // 3. Günlük limit kontrolü
                var dailyLimit = _context.DailyLimits.FirstOrDefault(d => d.UserId == senderAccount.UserId);
                if (dailyLimit != null)
                {
                    // Gün değiştiyse limiti sıfırla
                    if (dailyLimit.LastResetDate.Date < DateTime.Now.Date)
                    {
                        dailyLimit.UsedLimit = 0;
                        dailyLimit.LastResetDate = DateTime.Now.Date;
                    }

                    if (dailyLimit.UsedLimit + transaction.Amount > dailyLimit.MaxDailyLimit)
                    {
                        transaction.Status = "failed";
                        throw new InvalidOperationException($"Günlük limit aşıldı. Kalan: {dailyLimit.MaxDailyLimit - dailyLimit.UsedLimit:N2} TRY");
                    }

                    dailyLimit.UsedLimit += transaction.Amount;
                }

                // 4. Bakiye güncelleme
                var oldSenderBalance = senderAccount.Balance;
                var oldReceiverBalance = receiverAccount.Balance;

                senderAccount.Balance -= transaction.Amount;
                receiverAccount.Balance += transaction.Amount;

                // 5. Transaction kaydı
                transaction.Date = DateTime.Now;
                transaction.CreatedAt = DateTime.Now;
                transaction.Status = "completed";
                if (string.IsNullOrWhiteSpace(transaction.Description))
                {
                    transaction.Description = $"Transfer: {senderAccount.AccountNumber} → {receiverAccount.AccountNumber}";
                }
                _context.Transactions.Add(transaction);

                // 6. Ledger kayıtları (Immutable)
                _context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = senderAccount.Id,
                    Amount = -transaction.Amount,
                    PreviousBalance = oldSenderBalance,
                    NewBalance = senderAccount.Balance,
                    Description = $"Transfer gönderildi - Alıcı: {receiverAccount.AccountNumber}",
                    CreatedAt = DateTime.Now
                });

                _context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = receiverAccount.Id,
                    Amount = transaction.Amount,
                    PreviousBalance = oldReceiverBalance,
                    NewBalance = receiverAccount.Balance,
                    Description = $"Transfer alındı - Gönderici: {senderAccount.AccountNumber}",
                    CreatedAt = DateTime.Now
                });

                // 7. Fraud detection
                if (transaction.Amount > 10000)
                {
                    _context.FraudLogs.Add(new FraudLog
                    {
                        AccountId = senderAccount.Id,
                        RiskType = "HIGH_AMOUNT",
                        Description = $"Yüksek miktarlı transfer: {transaction.Amount:N2} TRY",
                        LogDate = DateTime.Now
                    });
                }

                // 8. Commit
                _context.SaveChanges();
                dbTransaction.Commit();

                _logger.LogInformation("✅ Transfer başarılı: {Amount} TRY, {Sender} -> {Receiver} (Status: {Status})",
                    transaction.Amount, senderAccount.AccountNumber, receiverAccount.AccountNumber, transaction.Status);
            }
            catch (Exception ex)
            {
                dbTransaction.Rollback();
                _logger.LogError(ex, "❌ Transfer başarısız: {Message}", ex.Message);
                throw;
            }
        }

        public Account? GetAccountByNumber(string accountNumber)
        {
            return _context.Accounts.FirstOrDefault(a => a.AccountNumber == accountNumber);
        }

        public void Deposit(string accountNumber, decimal amount, string? description)
        {
            if (amount <= 0) throw new InvalidOperationException("Deposit amount must be greater than 0.");

            using var dbTransaction = _context.Database.BeginTransaction(System.Data.IsolationLevel.Serializable);
            try
            {
                var account = _context.Accounts.FirstOrDefault(a => a.AccountNumber == accountNumber);
                if (account == null) throw new InvalidOperationException("Account not found.");

                decimal previousBalance = account.Balance;
                account.Balance += amount;

                _context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = account.Id,
                    Amount = amount,
                    PreviousBalance = previousBalance,
                    NewBalance = account.Balance,
                    Description = description ?? "Deposit",
                    CreatedAt = DateTime.Now
                });

                _context.SaveChanges();
                dbTransaction.Commit();
                
                _logger.LogInformation("💰 Deposit successful: {Amount} TRY to {AccountNumber}", amount, accountNumber);
            }
            catch (Exception ex)
            {
                dbTransaction.Rollback();
                _logger.LogError(ex, "❌ Deposit failed for {AccountNumber}", accountNumber);
                throw;
            }
        }
    }
}
