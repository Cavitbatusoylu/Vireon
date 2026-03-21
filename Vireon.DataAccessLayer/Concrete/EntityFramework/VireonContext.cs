using Microsoft.EntityFrameworkCore;
using Vireon.EntityLayer.Concrete;

namespace Vireon.DataAccessLayer.Concrete.EntityFramework
{
    public class VireonContext : DbContext
    {
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Bağlantı dizesini daha sonra Google Cloud'a göre güncelleyeceğiz.
            optionsBuilder.UseSqlServer("Server=YOUR_SERVER;Database=VireonDb;Trusted_Connection=True;");
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Account> Accounts { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<DailyLimit> DailyLimits { get; set; }
        public DbSet<FraudLog> FraudLogs { get; set; }
        public DbSet<LedgerEntry> LedgerEntries { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Decimal hassasiyeti (Rapor - Madde 1)
            foreach (var property in modelBuilder.Model.GetEntityTypes()
                .SelectMany(t => t.GetProperties())
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            {
                property.SetColumnType("decimal(18,2)");
            }

            // Concurrency (Rapor - Madde 7.2)
            modelBuilder.Entity<Account>()
                .Property(a => a.RowVersion)
                .IsRowVersion();
        }
    }
}
