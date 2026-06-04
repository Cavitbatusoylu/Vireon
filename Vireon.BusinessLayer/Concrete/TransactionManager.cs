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

        private static readonly Dictionary<string, decimal> ExchangeRates = new()
        {
            ["TRY"] = 1m,
            ["USD"] = 30.50m,
            ["EUR"] = 33.20m,
            ["GBP"] = 38.70m
        };

        public TransactionManager(VireonContext context, ILogger<TransactionManager> logger)
        {
            _context = context;
            _logger = logger;
        }

        public void ProcessTransaction(Transaction transaction)
        {
            transaction.Status = TransactionStatus.Pending;

            using var dbTransaction = _context.Database.BeginTransaction();
            try
            {
                var senderAccount = _context.Accounts.FirstOrDefault(a => a.Id == transaction.SenderAccountId);
                var receiverAccount = _context.Accounts.FirstOrDefault(a => a.Id == transaction.ReceiverAccountId);

                if (senderAccount == null || receiverAccount == null)
                {
                    transaction.Status = TransactionStatus.Failed;
                    throw new InvalidOperationException("Gönderici veya alıcı hesap bulunamadı.");
                }

                if (transaction.SenderAccountId == transaction.ReceiverAccountId)
                {
                    transaction.Status = TransactionStatus.Failed;
                    throw new InvalidOperationException("Kendi hesabınıza transfer yapamazsınız.");
                }

                if (transaction.Amount <= 0)
                {
                    transaction.Status = TransactionStatus.Failed;
                    throw new InvalidOperationException("Transfer miktarı 0'dan büyük olmalıdır.");
                }

                decimal amountInSenderCurrency = transaction.Amount;
                decimal amountInReceiverCurrency;

                if (senderAccount.Currency != receiverAccount.Currency)
                {
                    amountInReceiverCurrency = ConvertCurrency(transaction.Amount, senderAccount.Currency, receiverAccount.Currency);
                }
                else
                {
                    amountInReceiverCurrency = transaction.Amount;
                }

                if (senderAccount.Balance < amountInSenderCurrency)
                {
                    transaction.Status = TransactionStatus.Failed;
                    throw new InvalidOperationException($"Yetersiz bakiye. Mevcut: {senderAccount.Balance:N2} {senderAccount.Currency}, Gerekli: {amountInSenderCurrency:N2} {senderAccount.Currency}");
                }

                var dailyLimit = _context.DailyLimits.FirstOrDefault(d => d.UserId == senderAccount.UserId);
                if (dailyLimit != null)
                {
                    if (dailyLimit.LastResetDate.Date < DateTime.Now.Date)
                    {
                        dailyLimit.UsedLimit = 0;
                        dailyLimit.LastResetDate = DateTime.Now.Date;
                    }

                    if (dailyLimit.UsedLimit + amountInSenderCurrency > dailyLimit.MaxDailyLimit)
                    {
                        transaction.Status = TransactionStatus.Failed;

                        _context.FraudLogs.Add(new FraudLog
                        {
                            AccountId = senderAccount.Id,
                            RiskType = "LIMIT_EXCEEDED",
                            Description = $"Günlük limit aşımı denemesi: {amountInSenderCurrency:N2} {senderAccount.Currency} (Kalan limit: {dailyLimit.MaxDailyLimit - dailyLimit.UsedLimit:N2} {senderAccount.Currency})",
                            LogDate = DateTime.Now
                        });
                        _context.SaveChanges();

                        throw new InvalidOperationException($"Günlük limit aşıldı. Kalan: {dailyLimit.MaxDailyLimit - dailyLimit.UsedLimit:N2} {senderAccount.Currency}");
                    }

                    dailyLimit.UsedLimit += amountInSenderCurrency;
                }

                var oldSenderBalance = senderAccount.Balance;
                var oldReceiverBalance = receiverAccount.Balance;

                senderAccount.Balance -= amountInSenderCurrency;
                receiverAccount.Balance += amountInReceiverCurrency;

                transaction.Date = DateTime.Now;
                transaction.CreatedAt = DateTime.Now;
                transaction.Status = TransactionStatus.Completed;
                if (string.IsNullOrWhiteSpace(transaction.Description))
                {
                    string currencyInfo = senderAccount.Currency != receiverAccount.Currency
                        ? $" ({amountInSenderCurrency:N2} {senderAccount.Currency} → {amountInReceiverCurrency:N2} {receiverAccount.Currency})"
                        : $" {senderAccount.Currency}";
                    transaction.Description = $"Transfer: {senderAccount.AccountNumber} → {receiverAccount.AccountNumber}{currencyInfo}";
                }
                _context.Transactions.Add(transaction);

                _context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = senderAccount.Id,
                    Amount = -amountInSenderCurrency,
                    PreviousBalance = oldSenderBalance,
                    NewBalance = senderAccount.Balance,
                    Description = $"Transfer gönderildi - Alıcı: {receiverAccount.AccountNumber} ({senderAccount.Currency})",
                    CreatedAt = DateTime.Now
                });

                _context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = receiverAccount.Id,
                    Amount = amountInReceiverCurrency,
                    PreviousBalance = oldReceiverBalance,
                    NewBalance = receiverAccount.Balance,
                    Description = $"Transfer alındı - Gönderici: {senderAccount.AccountNumber} ({receiverAccount.Currency})",
                    CreatedAt = DateTime.Now
                });

                // Fraud (şüpheli işlem) kayıtları — engellemeden loglanır, admin panelinden görüntülenir.
                if (amountInSenderCurrency > 10000)
                {
                    _context.FraudLogs.Add(new FraudLog
                    {
                        AccountId = senderAccount.Id,
                        RiskType = "HIGH_AMOUNT",
                        Description = $"Yüksek miktarlı transfer: {amountInSenderCurrency:N2} {senderAccount.Currency}",
                        LogDate = DateTime.Now
                    });
                }
                var currentHour = DateTime.Now.Hour;
                if ((currentHour >= 0 && currentHour <= 5) && transaction.Amount > 5000)
                {
                    _context.FraudLogs.Add(new FraudLog
                    {
                        AccountId = senderAccount.Id,
                        RiskType = "SUSPICIOUS_NIGHT_TRANSFER",
                        Description = $"Gece yarısı yüksek tutarlı transfer denemesi: {transaction.Amount:N2} TRY (Saat: {currentHour:D2}:00)",
                        LogDate = DateTime.Now
                    });
                }

                var oneMinuteAgo = DateTime.Now.AddMinutes(-1);
                var recentTransactionsCount = _context.Transactions
                    .Count(t => t.SenderAccountId == senderAccount.Id && t.CreatedAt >= oneMinuteAgo);
                if (recentTransactionsCount >= 3) // Bu işlemle birlikte 4. işlem olacaksa şüpheli say
                {
                    _context.FraudLogs.Add(new FraudLog
                    {
                        AccountId = senderAccount.Id,
                        RiskType = "FREQUENT_TRANSACTIONS",
                        Description = $"Olağandışı aktivite: Son 1 dakikada {recentTransactionsCount + 1} işlem denemesi.",
                        LogDate = DateTime.Now
                    });
                }

                _context.SaveChanges();
                dbTransaction.Commit();

                string logCurrency = senderAccount.Currency != receiverAccount.Currency
                    ? $"{amountInSenderCurrency:N2} {senderAccount.Currency} → {amountInReceiverCurrency:N2} {receiverAccount.Currency}"
                    : $"{amountInSenderCurrency:N2} {senderAccount.Currency}";

                _logger.LogInformation("✅ Transfer başarılı: {Amount}, {Sender} -> {Receiver} (Status: {Status})",
                    logCurrency, senderAccount.AccountNumber, receiverAccount.AccountNumber, transaction.Status);
            }
            // BURAYI EKLİYORUZ: Eşzamanlılık (Concurrency) Çakışması Yakalama
            catch (DbUpdateConcurrencyException ex) 
            {
                dbTransaction.Rollback();
                _logger.LogError(ex, "❌ Eşzamanlılık çakışması (Concurrency): Aynı hesaba aynı anda işlem yapıldı.");
                throw new InvalidOperationException("İşleminiz sırasında bir çakışma oldu (aynı anda başka bir işlem yapılmış olabilir). Lütfen tekrar deneyin.");
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

        public decimal ConvertCurrency(decimal amount, string fromCurrency, string toCurrency)
        {
            if (fromCurrency == toCurrency) return amount;

            if (!ExchangeRates.ContainsKey(fromCurrency))
                throw new InvalidOperationException($"Desteklenmeyen para birimi: {fromCurrency}");

            if (!ExchangeRates.ContainsKey(toCurrency))
                throw new InvalidOperationException($"Desteklenmeyen para birimi: {toCurrency}");

            decimal amountInTry = amount * ExchangeRates[fromCurrency];
            return amountInTry / ExchangeRates[toCurrency];
        }

        public void Deposit(string accountNumber, decimal amount, string? description)
        {
            if (amount <= 0) throw new InvalidOperationException("Deposit amount must be greater than 0.");

            using var dbTransaction = _context.Database.BeginTransaction();
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

                _context.Transactions.Add(new Transaction
                {
                    SenderAccountId = account.Id, // Kendi kendine gibi gösteriyoruz
                    ReceiverAccountId = account.Id,
                    Amount = amount,
                    Description = description ?? "Para Yatırma / Deposit",
                    Date = DateTime.Now,
                    Status = TransactionStatus.Completed
                });

                _context.SaveChanges();
                dbTransaction.Commit();

                _logger.LogInformation("💰 Deposit successful: {Amount} {Currency} to {AccountNumber}", amount, account.Currency, accountNumber);
            }
            catch (Exception ex)
            {
                dbTransaction.Rollback();
                _logger.LogError(ex, "❌ Deposit failed for {AccountNumber}", accountNumber);
                throw;
            }
        }
        public int GetRecentTransactionCount(int accountId, int minutes)
        {
            var timeLimit = DateTime.Now.AddMinutes(-minutes);
            return _context.Transactions
                .Count(t => t.SenderAccountId == accountId && t.CreatedAt >= timeLimit);
        }
    }
}
