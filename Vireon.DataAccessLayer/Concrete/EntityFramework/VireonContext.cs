using Microsoft.EntityFrameworkCore;
using System.Linq;
using Vireon.EntityLayer.Concrete;

namespace Vireon.DataAccessLayer.Concrete.EntityFramework
{
    public class VireonContext : DbContext
    {
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Azure SQL Bağlantı Dizesi
            optionsBuilder.UseSqlServer("Server=tcp:vireon-server-1234.database.windows.net,1433;Initial Catalog=VireonDb;Persist Security Info=False;User ID=vireonadmin;Password=vireondb02#;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=120;Command Timeout=120;");
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Para birimleri için 18,2 formatı (Teknik Rapor uyumu)
            foreach (var property in modelBuilder.Model.GetEntityTypes().SelectMany(t => t.GetProperties()).Where(p => p.ClrType == typeof(decimal)))
            {
                property.SetColumnType("decimal(18,2)");
            }

            // 2. Transaction -> Account ilişkileri (Sender ve Receiver ayrı FK'lar)
            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.SenderAccount)
                .WithMany(a => a.SentTransactions)
                .HasForeignKey(t => t.SenderAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.ReceiverAccount)
                .WithMany(a => a.ReceivedTransactions)
                .HasForeignKey(t => t.ReceiverAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            // 4. DailyLimit -> User birebir ilişki
            modelBuilder.Entity<DailyLimit>()
                .HasOne(d => d.User)
                .WithOne(u => u.DailyLimit)
                .HasForeignKey<DailyLimit>(d => d.UserId);

            // 5. Seed Data (Hoca Kontrolü 1 için örnek veriler)
            modelBuilder.Entity<User>().HasData(new User
            {
                Id = 1,
                Name = "Vireon",
                Surname = "Admin",
                Email = "admin@vireon.com",
                Password = "123"
            });

            modelBuilder.Entity<Account>().HasData(new Account
            {
                Id = 1,
                UserId = 1,
                AccountNumber = "VR-1001",
                Balance = 1000,
                Currency = "TRY"
            });
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Account> Accounts { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<DailyLimit> DailyLimits { get; set; }
        public DbSet<FraudLog> FraudLogs { get; set; }
        public DbSet<LedgerEntry> LedgerEntries { get; set; }
    }
}
