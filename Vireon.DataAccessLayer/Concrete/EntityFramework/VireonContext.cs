using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Linq;
using Vireon.EntityLayer.Concrete;

namespace Vireon.DataAccessLayer.Concrete.EntityFramework
{
    public class VireonContext : DbContext // Veritabanı bağlantı ve yapılandırma sınıfı (Entity Framework Core)
    {
        private readonly IConfiguration? _configuration;

        public VireonContext() { }

        public VireonContext(DbContextOptions<VireonContext> options, IConfiguration configuration) 
            : base(options)
        {
            _configuration = configuration;
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) // Veritabanı bağlantı ayarları
        {
            if (!optionsBuilder.IsConfigured)
            {
                // SQL Server Bağlantı Dizesi - CBS Sunucusu
                var connectionString = _configuration?.GetConnectionString("VireonDB") 
                    ?? "Server=CBS;Database=VireonDB;Integrated Security=true;TrustServerCertificate=true;";
                
                // SQL Server bağlantısını yapılandır
                optionsBuilder.UseSqlServer(connectionString);
                
                // Development ortamında detaylı log
                optionsBuilder.EnableSensitiveDataLogging();
                optionsBuilder.EnableDetailedErrors();
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder) // Tablo yapılandırmaları ve ilişkiler
        {
            base.OnModelCreating(modelBuilder);

            // 1. Para birimleri için 18,2 formatı (hassas finansal hesaplama)
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

            // 3. DailyLimit -> User birebir ilişki
            modelBuilder.Entity<DailyLimit>()
                .HasOne(d => d.User)
                .WithOne(u => u.DailyLimit)
                .HasForeignKey<DailyLimit>(d => d.UserId);

            // ==================== SEED DATA (Örnek Veriler) ====================

            // Kullanıcılar
            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, Name = "Cavit Batu", Surname = "Soylu", Email = "cavitbatu@vireon.com", Password = "123456" },
                new User { Id = 2, Name = "Enes", Surname = "Kaya", Email = "enes@vireon.com", Password = "123456" },
                new User { Id = 3, Name = "Kerem", Surname = "Arslan", Email = "kerem@vireon.com", Password = "123456" }
            );

            // Hesaplar
            modelBuilder.Entity<Account>().HasData(
                new Account { Id = 1, UserId = 1, AccountNumber = "VR-1001", Balance = 15000, Currency = "TRY" },
                new Account { Id = 2, UserId = 2, AccountNumber = "VR-1002", Balance = 8500, Currency = "TRY" },
                new Account { Id = 3, UserId = 3, AccountNumber = "VR-1003", Balance = 3200, Currency = "TRY" }
            );

            // Günlük Limitler
            modelBuilder.Entity<DailyLimit>().HasData(
                new DailyLimit { Id = 1, UserId = 1, MaxDailyLimit = 50000, UsedLimit = 1500, LastResetDate = new DateTime(2026, 4, 4) },
                new DailyLimit { Id = 2, UserId = 2, MaxDailyLimit = 25000, UsedLimit = 0, LastResetDate = new DateTime(2026, 4, 4) },
                new DailyLimit { Id = 3, UserId = 3, MaxDailyLimit = 10000, UsedLimit = 500, LastResetDate = new DateTime(2026, 4, 4) }
            );

            // İşlemler (Para Transferleri)
            modelBuilder.Entity<Transaction>().HasData(
                new Transaction { Id = 1, SenderAccountId = 1, ReceiverAccountId = 2, Amount = 1000, Date = new DateTime(2026, 4, 1) },
                new Transaction { Id = 2, SenderAccountId = 2, ReceiverAccountId = 3, Amount = 500, Date = new DateTime(2026, 4, 2) },
                new Transaction { Id = 3, SenderAccountId = 1, ReceiverAccountId = 3, Amount = 250, Date = new DateTime(2026, 4, 3) }
            );

            // Dolandırıcılık Kayıtları
            modelBuilder.Entity<FraudLog>().HasData(
                new FraudLog { Id = 1, AccountId = 1, RiskType = "Low", Description = "Normal işlem", LogDate = new DateTime(2026, 4, 1) },
                new FraudLog { Id = 2, AccountId = 2, RiskType = "Medium", Description = "Yüksek tutarlı işlem tespit edildi", LogDate = new DateTime(2026, 4, 2) }
            );

            // Muhasebe Kayıtları (Immutable Ledger)
            modelBuilder.Entity<LedgerEntry>().HasData(
                new LedgerEntry { Id = 1, AccountId = 1, Amount = -1000, PreviousBalance = 16000, NewBalance = 15000, Description = "VR-1002 hesabına havale", CreatedAt = new DateTime(2026, 4, 1) },
                new LedgerEntry { Id = 2, AccountId = 2, Amount = 1000, PreviousBalance = 7500, NewBalance = 8500, Description = "VR-1001 hesabından havale", CreatedAt = new DateTime(2026, 4, 1) },
                new LedgerEntry { Id = 3, AccountId = 2, Amount = -500, PreviousBalance = 8500, NewBalance = 8000, Description = "VR-1003 hesabına havale", CreatedAt = new DateTime(2026, 4, 2) },
                new LedgerEntry { Id = 4, AccountId = 3, Amount = 500, PreviousBalance = 2700, NewBalance = 3200, Description = "VR-1002 hesabından havale", CreatedAt = new DateTime(2026, 4, 2) }
            );
        }

        // Veritabanı Tablo Tanımlamaları (DbSet)
        public DbSet<User> Users { get; set; }                   // Kullanıcılar tablosu
        public DbSet<Account> Accounts { get; set; }             // Hesaplar tablosu
        public DbSet<Transaction> Transactions { get; set; }     // İşlemler tablosu
        public DbSet<DailyLimit> DailyLimits { get; set; }       // Günlük limitler tablosu
        public DbSet<FraudLog> FraudLogs { get; set; }           // Dolandırıcılık kayıtları tablosu
        public DbSet<LedgerEntry> LedgerEntries { get; set; }    // Defter kayıtları tablosu
    }
}

