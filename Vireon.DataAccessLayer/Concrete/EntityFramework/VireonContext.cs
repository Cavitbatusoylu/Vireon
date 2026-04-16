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
                // SQLite Bağlantı Dizesi
                var connectionString = _configuration?.GetConnectionString("VireonDB") 
                    ?? "Data Source=../vireon_local.db";
                
                // SQLite bağlantısını yapılandır
                optionsBuilder.UseSqlite(connectionString);
                
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

            // 4. Account -> AccountNumber unique constraint
            modelBuilder.Entity<Account>()
                .HasIndex(a => a.AccountNumber)
                .IsUnique();

            // 5. User -> Email unique constraint
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // 6. User -> AccountNumber unique constraint (hesap numarası benzersiz olmalı)
            modelBuilder.Entity<User>()
                .HasIndex(u => u.AccountNumber)
                .IsUnique();

            // 7. Transaction -> Status enum conversion (DB'de string olarak sakla)
            modelBuilder.Entity<Transaction>()
                .Property(t => t.Status)
                .HasConversion<string>()
                .HasDefaultValue(Vireon.EntityLayer.Concrete.TransactionStatus.Pending)
                .HasMaxLength(20);

            // ============================================================
            // 8. DATABASE INDEXLERI (Performans İyileştirmesi)
            // ============================================================

            // Transaction indexleri
            modelBuilder.Entity<Transaction>()
                .HasIndex(t => t.SenderAccountId);
            modelBuilder.Entity<Transaction>()
                .HasIndex(t => t.ReceiverAccountId);
            modelBuilder.Entity<Transaction>()
                .HasIndex(t => t.CreatedAt);

            // Account -> UserId index
            modelBuilder.Entity<Account>()
                .HasIndex(a => a.UserId);

            // LedgerEntry -> AccountId ve CreatedAt indexleri
            modelBuilder.Entity<LedgerEntry>()
                .HasIndex(l => l.AccountId);
            modelBuilder.Entity<LedgerEntry>()
                .HasIndex(l => l.CreatedAt);

            // FraudLog -> AccountId index
            modelBuilder.Entity<FraudLog>()
                .HasIndex(f => f.AccountId);

            // DailyLimit -> UserId index
            modelBuilder.Entity<DailyLimit>()
                .HasIndex(d => d.UserId)
                .IsUnique();
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

