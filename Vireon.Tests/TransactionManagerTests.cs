using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Vireon.BusinessLayer.Concrete;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.Tests
{
    public class TransactionManagerTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly VireonContext _context;
        private readonly TransactionManager _manager;
        private readonly Account _senderAccount;
        private readonly Account _receiverAccount;

        public TransactionManagerTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<VireonContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new VireonContext(options, null!);
            _context.Database.EnsureCreated();

            var user = new User
            {
                Name = "Test",
                Surname = "User",
                Email = "test@test.com",
                Password = "hashed",
                AccountNumber = "VR-TEST1",
                CreatedAt = DateTime.Now
            };
            _context.Users.Add(user);
            _context.SaveChanges();

            _senderAccount = new Account
            {
                UserId = user.Id,
                AccountNumber = "VR-TEST1",
                Balance = 10000m,
                Currency = "TRY"
            };
            _context.Accounts.Add(_senderAccount);

            _receiverAccount = new Account
            {
                UserId = user.Id,
                AccountNumber = "VR-TEST2",
                Balance = 5000m,
                Currency = "TRY"
            };
            _context.Accounts.Add(_receiverAccount);

            _context.DailyLimits.Add(new DailyLimit
            {
                UserId = user.Id,
                MaxDailyLimit = 50000m,
                UsedLimit = 0m,
                LastResetDate = DateTime.Now.Date
            });

            _context.SaveChanges();

            var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<TransactionManager>();
            _manager = new TransactionManager(_context, logger);
        }

        [Fact]
        public void ProcessTransaction_WithValidData_ShouldCompleteSuccessfully()
        {
            var transaction = new Transaction
            {
                SenderAccountId = _senderAccount.Id,
                ReceiverAccountId = _receiverAccount.Id,
                Amount = 1000m,
                Description = "Test transfer"
            };

            _manager.ProcessTransaction(transaction);

            Assert.Equal(TransactionStatus.Completed, transaction.Status);
            Assert.Equal(9000m, _senderAccount.Balance);
            Assert.Equal(6000m, _receiverAccount.Balance);
        }

        [Fact]
        public void ProcessTransaction_WithInsufficientBalance_ShouldThrowException()
        {
            var transaction = new Transaction
            {
                SenderAccountId = _senderAccount.Id,
                ReceiverAccountId = _receiverAccount.Id,
                Amount = 999999m
            };

            var ex = Assert.Throws<InvalidOperationException>(() => _manager.ProcessTransaction(transaction));
            Assert.Contains("Yetersiz bakiye", ex.Message);
        }

        [Fact]
        public void ProcessTransaction_WithSameAccount_ShouldThrowException()
        {
            var transaction = new Transaction
            {
                SenderAccountId = _senderAccount.Id,
                ReceiverAccountId = _senderAccount.Id,
                Amount = 100m
            };

            var ex = Assert.Throws<InvalidOperationException>(() => _manager.ProcessTransaction(transaction));
            Assert.Contains("Kendi hesabınıza", ex.Message);
        }

        [Fact]
        public void ProcessTransaction_WithNegativeAmount_ShouldThrowException()
        {
            var transaction = new Transaction
            {
                SenderAccountId = _senderAccount.Id,
                ReceiverAccountId = _receiverAccount.Id,
                Amount = -100m
            };

            var ex = Assert.Throws<InvalidOperationException>(() => _manager.ProcessTransaction(transaction));
            Assert.Contains("0'dan büyük", ex.Message);
        }

        [Fact]
        public void GetAccountByNumber_WithValidNumber_ShouldReturnAccount()
        {
            var result = _manager.GetAccountByNumber("VR-TEST1");
            Assert.NotNull(result);
            Assert.Equal(_senderAccount.Id, result!.Id);
        }

        [Fact]
        public void GetAccountByNumber_WithInvalidNumber_ShouldReturnNull()
        {
            var result = _manager.GetAccountByNumber("NONEXISTENT");
            Assert.Null(result);
        }

        [Fact]
        public void ConvertCurrency_WithSameCurrency_ShouldReturnSameAmount()
        {
            var result = _manager.ConvertCurrency(100m, "TRY", "TRY");
            Assert.Equal(100m, result);
        }

        [Fact]
        public void ConvertCurrency_FromUsdToTry_ShouldConvertCorrectly()
        {
            var result = _manager.ConvertCurrency(100m, "USD", "TRY");
            Assert.Equal(3050m, result);
        }

        [Fact]
        public void Deposit_WithValidData_ShouldIncreaseBalance()
        {
            _manager.Deposit("VR-TEST1", 500m, "Test deposit");
            Assert.Equal(10500m, _senderAccount.Balance);
        }

        [Fact]
        public void ProcessTransaction_ExceedingDailyLimit_ShouldThrowException()
        {
            var dailyLimit = _context.DailyLimits.First(d => d.UserId == _senderAccount.UserId);
            dailyLimit.MaxDailyLimit = 500m;
            _context.SaveChanges();

            var transaction = new Transaction
            {
                SenderAccountId = _senderAccount.Id,
                ReceiverAccountId = _receiverAccount.Id,
                Amount = 600m
            };

            var ex = Assert.Throws<InvalidOperationException>(() => _manager.ProcessTransaction(transaction));
            Assert.Contains("limit", ex.Message.ToLowerInvariant());
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Close();
        }
    }
}
