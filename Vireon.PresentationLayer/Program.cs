using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.BusinessLayer.Abstract;
using Vireon.BusinessLayer.Concrete;
using Vireon.EntityLayer.Concrete;
using Vireon.PresentationLayer.Middleware;
using Vireon.PresentationLayer.Services;

internal class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Serilog yapılandırması
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .WriteTo.Console()
            .WriteTo.File("../logs/vireon-.log", rollingInterval: RollingInterval.Day)
            .CreateLogger();

        builder.Host.UseSerilog();

        // Servisleri konteynere ekle
        builder.Services.AddDbContext<VireonContext>((serviceProvider, options) =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var rawConnection = configuration.GetConnectionString("VireonDB") ?? "Data Source=../Database/vireon_local.db";

            // SQLite dosya yolunu çalışma dizininden (cwd) ve başlatma yönteminden bağımsız
            // hale getiriyoruz. Böylece uygulama ister "dotnet run", ister derlenmiş .exe,
            // ister farklı bir cihazdan çalıştırılsın her zaman repodaki ortak
            // Database/vireon_local.db dosyası kullanılır (herkes aynı veriyi görür).
            var csb = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(rawConnection);
            if (!string.IsNullOrWhiteSpace(csb.DataSource) && !Path.IsPathRooted(csb.DataSource))
            {
                csb.DataSource = ResolveSharedDbPath(builder.Environment.ContentRootPath, csb.DataSource);
            }

            options.UseSqlite(csb.ConnectionString);
        });

        builder.Services.AddCors(options => // CORS politikası (Frontend erişimi için)
        {
            options.AddPolicy("AllowAll", policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
        });

        builder.Services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        });

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            c.EnableAnnotations();
            c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
            {
                Title = "Vireon Digital Banking API",
                Version = "v1",
                Description = "Enterprise-grade digital banking core system with ACID transactions, immutable ledger, and AI-powered fraud detection."
            });
            var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
        });

        builder.Services.AddAutoMapper(config =>                                                                                            //Enes
        {
            config.AddProfile<Vireon.PresentationLayer.Mappings.VireonMappingProfile>();
        });

        // Güvenlik kurallarını (Validator'ları) bulup sisteme dahil ediyoruz
        builder.Services.AddValidatorsFromAssemblyContaining<Vireon.PresentationLayer.Validators.TransferRequestDtoValidator>();

        // Sisteme diyoruz ki: Vezne senden ITransactionService isterse, ona TransactionManager'ı ver.
        builder.Services.AddScoped<ITransactionService, TransactionManager>();                                                               //Enes

        builder.Services.Configure<NeonAIOptions>(builder.Configuration.GetSection("NeonAI"));
        builder.Services.AddHttpClient<NeonAIService>();

        builder.Services.AddSingleton<Vireon.BusinessLayer.Concrete.FraudModelService>();

        builder.Services.Configure<SharedDatabaseGitSyncOptions>(builder.Configuration.GetSection("SharedDatabase"));
        builder.Services.AddSingleton<SharedDatabaseGitSync>();
        builder.Services.AddHostedService(sp => sp.GetRequiredService<SharedDatabaseGitSync>());

        var app = builder.Build();
        var isDevelopment = app.Environment.IsDevelopment();
        var dbGitSync = app.Services.GetRequiredService<SharedDatabaseGitSync>();

        // Önce GitHub'daki güncel DB'yi çek (ekip senkronu)
        dbGitSync.PullOnStartupIfEnabled();

        // ============================================================
        // OTOMATIK DATABASE MIGRATION VE SEED DATA
        // Proje her başlatıldığında database'i kontrol eder ve gerekirse oluşturur
        // ============================================================
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            try
            {
                var context = services.GetRequiredService<VireonContext>();
                var logger = services.GetRequiredService<ILogger<Program>>();

                logger.LogInformation("Database bağlantısı kontrol ediliyor...");

                // Database yoksa oluştur, migration'ları uygula
                context.Database.Migrate();

                var dbPath = context.Database.GetDbConnection().DataSource;
                logger.LogInformation("📂 Paylaşımlı SQLite: {DbPath}", dbPath);

                // ============================================================
                // MEVCUT KULLANICILARA HESAP NUMARASI ATA
                // Migration sonrası AccountNumber'ı boş olan kullanıcıları düzelt
                // ============================================================
                var usersWithoutAccountNumber = context.Users
                    .Where(u => u.AccountNumber == null || u.AccountNumber == "")
                    .ToList();

                if (usersWithoutAccountNumber.Any())
                {
                    logger.LogInformation("⚠️ {Count} kullanıcıya hesap numarası atanıyor...", usersWithoutAccountNumber.Count);
                    foreach (var user in usersWithoutAccountNumber)
                    {
                        string accountNumber;
                        do
                        {
                            var number = Random.Shared.Next(1000, 99999);
                            accountNumber = $"VR-{number:D5}";
                        } while (context.Users.Any(u => u.AccountNumber == accountNumber) ||
                                 context.Accounts.Any(a => a.AccountNumber == accountNumber));

                        user.AccountNumber = accountNumber;
                        user.CreatedAt = user.CreatedAt == default ? DateTime.Now : user.CreatedAt;

                        // Kullanıcının hesabı yoksa oluştur
                        var hasAccount = context.Accounts.Any(a => a.UserId == user.Id);
                        if (!hasAccount)
                        {
                            context.Accounts.Add(new Vireon.EntityLayer.Concrete.Account
                            {
                                UserId = user.Id,
                                AccountNumber = accountNumber,
                                Balance = 0m,
                                Currency = "TRY"
                            });
                        }
                        else
                        {
                            // Mevcut hesabın numarasını güncelle
                            var account = context.Accounts.FirstOrDefault(a => a.UserId == user.Id);
                            if (account != null && (string.IsNullOrEmpty(account.AccountNumber) || account.AccountNumber.StartsWith("VR-000")))
                            {
                                account.AccountNumber = accountNumber;
                            }
                        }

                        // Günlük limiti yoksa oluştur
                        var hasLimit = context.DailyLimits.Any(d => d.UserId == user.Id);
                        if (!hasLimit)
                        {
                            context.DailyLimits.Add(new Vireon.EntityLayer.Concrete.DailyLimit
                            {
                                UserId = user.Id,
                                MaxDailyLimit = 50000m,
                                UsedLimit = 0m,
                                LastResetDate = DateTime.Now.Date
                            });
                        }

                        logger.LogInformation("  → {Name} ({Email}) → {AccountNumber}", user.Name, user.Email, accountNumber);
                    }
                    context.SaveChanges();
                    logger.LogInformation("✅ Tüm kullanıcılara hesap numarası atandı!");
                }

                // ============================================================
                // MEVCUT DÜZ METİN ŞİFRELERİ HASH'LE (Tek Seferlik Migration)
                // BCrypt hash'leri "$2" ile başlar, düz metin şifreler başlamaz
                // ============================================================
                var usersWithPlainPassword = context.Users
                    .Where(u => u.Password != null && !u.Password.StartsWith("$2"))
                    .ToList();

                if (usersWithPlainPassword.Any())
                {
                    logger.LogInformation("🔐 {Count} kullanıcının şifresi hash'leniyor...", usersWithPlainPassword.Count);
                    foreach (var user in usersWithPlainPassword)
                    {
                        if (string.IsNullOrEmpty(user.PlainPassword))
                            user.PlainPassword = user.Password;
                        user.Password = BCrypt.Net.BCrypt.HashPassword(user.PlainPassword);
                        logger.LogInformation("  → {Email} şifresi hash'lendi (PlainPassword korundu)", user.Email);
                    }
                    context.SaveChanges();
                    logger.LogInformation("✅ Tüm şifreler güvenli hale getirildi!");
                }

                // ============================================================
                // ADMIN ROLÜ — cavit@vireon.com (EnsureDemoAccounts ile de güncellenir)
                // ============================================================
                var adminUser = context.Users.FirstOrDefault(u => u.Email == "cavit@vireon.com");
                if (adminUser != null && adminUser.Role != "Admin")
                {
                    adminUser.Role = "Admin";
                    context.SaveChanges();
                    logger.LogInformation("🛡️ Admin rolü atandı: {Email}", adminUser.Email);
                }

                logger.LogInformation("✅ Database hazır!");

                var configuration = services.GetRequiredService<IConfiguration>();
                if (configuration.GetValue<bool>("SharedDatabase:ResetDemoIdsOnStartup"))
                {
                    ResetDemoDatabaseToSequentialIds(context, logger);
                }

                // ============================================================
                // DEMO HESAPLARI — Her uygulama açılışında senkronize edilir
                // (şifre, rol, hesap no, limit; mevcut işlem geçmişi silinmez)
                // ============================================================
                EnsureDemoAccounts(context, logger);
                dbGitSync.SchedulePush();

                // ============================================================
                // TEST KULLANICISINI KALDIR (testuser@example.com)
                // ============================================================
                var testUser = context.Users.FirstOrDefault(u => u.Email == "testuser@example.com");
                if (testUser != null)
                {
                    var testAccountIds = context.Accounts.Where(a => a.UserId == testUser.Id).Select(a => a.Id).ToList();
                    foreach (var accId in testAccountIds)
                    {
                        context.LedgerEntries.RemoveRange(context.LedgerEntries.Where(l => l.AccountId == accId));
                        context.FraudLogs.RemoveRange(context.FraudLogs.Where(f => f.AccountId == accId));
                        context.Transactions.RemoveRange(
                            context.Transactions.Where(t => t.SenderAccountId == accId || t.ReceiverAccountId == accId));
                    }
                    context.DailyLimits.RemoveRange(context.DailyLimits.Where(d => d.UserId == testUser.Id));
                    context.Accounts.RemoveRange(context.Accounts.Where(a => a.UserId == testUser.Id));
                    context.Users.Remove(testUser);
                    context.SaveChanges();
                    logger.LogInformation("🗑️ Test kullanıcısı silindi: testuser@example.com");
                }
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "❌ Database oluşturulurken hata: {Message}", ex.Message);
                logger.LogWarning("⚠️ Lütfen SQLite connection string'inin (VireonDB) doğru olduğundan ve dosya yolunun yazılabilir olduğundan emin olun.");
            }
        }

        // Swagger arayüzü
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Vireon API v1");
            c.RoutePrefix = "swagger";
        });

        // ============================================================
        // GLOBAL ERROR HANDLING MIDDLEWARE
        // Tüm yakalanmamış exception'ları standart JSON formatında döndürür
        // ============================================================
        app.UseMiddleware<ErrorHandlingMiddleware>();

        // ============================================================
        // GÜVENLİK BAŞLIKLARI (Security Headers)
        // ============================================================
        app.Use(async (context, next) =>
        {
            // XSS koruması
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["X-Frame-Options"] = "DENY";
            context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            await next();
        });

        // ============================================================
        // CACHE KONTROL — Akıllı Cache Stratejisi
        // HTML: always fresh | JS/CSS: 1 hour | Images: 24 hours
        // ============================================================
        app.Use(async (context, next) =>
        {
            var path = context.Request.Path.Value ?? "";
            if (path.EndsWith(".html") || path == "/")
            {
                context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                context.Response.Headers["Pragma"] = "no-cache";
                context.Response.Headers["Expires"] = "0";
            }
            else if (path.EndsWith(".js") || path.EndsWith(".css"))
            {
                context.Response.Headers["Cache-Control"] = isDevelopment
                    ? "no-cache, no-store, must-revalidate"
                    : "public, max-age=3600";
            }
            else if (path.EndsWith(".png") || path.EndsWith(".jpg") || path.EndsWith(".ico") || path.EndsWith(".webp"))
            {
                context.Response.Headers["Cache-Control"] = "public, max-age=86400";
            }
            await next();
        });

        app.UseCors("AllowAll");

        app.UseDefaultFiles();
        app.UseStaticFiles();

        app.UseAuthorization();

        app.MapControllers();

        // ============================================================
        // İSTEK LOGLAMA (Request Logging)
        // ============================================================
        app.Use(async (context, next) =>
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            var method = context.Request.Method;
            var path = context.Request.Path;

            // Sadece API isteklerini logla
            if (path.StartsWithSegments("/api"))
            {
                logger.LogInformation("📡 {Method} {Path}", method, path);
            }

            await next();
        });

        app.Run();
    }

    /// <summary>
    /// SQLite veritabanı dosyasının paylaşılan/sabit yolunu çözer.
    /// ContentRoot'tan başlayıp yukarı doğru ilerleyerek "Database" klasörünü bulur;
    /// böylece "dotnet run", derlenmiş .exe veya farklı çalışma dizinleri fark etmeksizin
    /// her zaman repodaki aynı vireon_local.db dosyası kullanılır.
    /// </summary>
    private static string ResolveSharedDbPath(string contentRootPath, string relativeDataSource)
    {
        var fileName = Path.GetFileName(relativeDataSource);
        if (string.IsNullOrWhiteSpace(fileName)) fileName = "vireon_local.db";

        // ContentRoot'tan yukarı doğru "Database" klasörünü ara.
        var dir = new DirectoryInfo(contentRootPath);
        for (int depth = 0; dir != null && depth < 8; depth++, dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "Database");
            if (Directory.Exists(candidate))
            {
                return Path.Combine(candidate, fileName);
            }
        }

        // Bulunamazsa: ContentRoot'a göre çöz ve klasörü oluştur.
        var fallback = Path.GetFullPath(Path.Combine(contentRootPath, relativeDataSource));
        var fallbackDir = Path.GetDirectoryName(fallback);
        if (!string.IsNullOrEmpty(fallbackDir)) Directory.CreateDirectory(fallbackDir);
        return fallback;
    }

    private sealed record DemoAccountSpec(
        string Name,
        string Surname,
        string Email,
        string Password,
        string AccountNo,
        decimal InitialBalance,
        decimal MaxDailyLimit,
        string Role);

    private static readonly DemoAccountSpec[] DemoAccounts =
    {
        new("Cavit Batu", "Soylu", "cavit@vireon.com", "admin123", "VR-99999", 1_000_000m, 100_000m, "Admin"),
        new("Enes", "Kaya", "enes@vireon.com", "enes123", "VR-88888", 50_000m, 100_000m, "User"),
        new("Kerem", "Arslan", "kerem@vireon.com", "kerem123", "VR-77777", 50_000m, 100_000m, "User"),
    };

    private static void ResetDemoDatabaseToSequentialIds(VireonContext context, Microsoft.Extensions.Logging.ILogger logger)
    {
        logger.LogWarning("🧹 Veritabanı sıfırlanıyor — demo hesaplar ID 1, 2, 3... olacak; eski kayıtlar siliniyor.");

        context.Database.ExecuteSqlRaw("DELETE FROM LedgerEntries;");
        context.Database.ExecuteSqlRaw("DELETE FROM FraudLogs;");
        context.Database.ExecuteSqlRaw("DELETE FROM Transactions;");
        context.Database.ExecuteSqlRaw("DELETE FROM DailyLimits;");
        context.Database.ExecuteSqlRaw("DELETE FROM Accounts;");
        context.Database.ExecuteSqlRaw("DELETE FROM Users;");
        context.Database.ExecuteSqlRaw(
            "DELETE FROM sqlite_sequence WHERE name IN ('Users','Accounts','Transactions','LedgerEntries','FraudLogs','DailyLimits');");

        logger.LogInformation("✅ Eski kullanıcı/işlem kayıtları temizlendi; demo hesaplar yeniden oluşturulacak.");
    }

    /// <summary>
    /// Demo hesaplarını her uygulama başlangıcında oluşturur veya günceller.
    /// Şifre, rol ve hesap numarası sabit demo spec ile uyumlu kalır; işlem geçmişi korunur.
    /// </summary>
    private static void EnsureDemoAccounts(VireonContext context, Microsoft.Extensions.Logging.ILogger logger)
    {
        logger.LogInformation("🔄 Demo hesapları senkronize ediliyor...");

        foreach (var spec in DemoAccounts)
        {
            var user = context.Users.FirstOrDefault(u => u.Email == spec.Email);
            if (user == null)
            {
                user = new User
                {
                    Name = spec.Name,
                    Surname = spec.Surname,
                    Email = spec.Email,
                    Password = BCrypt.Net.BCrypt.HashPassword(spec.Password),
                    PlainPassword = spec.Password,
                    AccountNumber = spec.AccountNo,
                    CreatedAt = DateTime.Now,
                    Role = spec.Role
                };
                context.Users.Add(user);
                context.SaveChanges();

                var account = new Account
                {
                    UserId = user.Id,
                    AccountNumber = spec.AccountNo,
                    Balance = spec.InitialBalance,
                    Currency = "TRY"
                };
                context.Accounts.Add(account);
                context.SaveChanges();

                context.DailyLimits.Add(new DailyLimit
                {
                    UserId = user.Id,
                    MaxDailyLimit = spec.MaxDailyLimit,
                    UsedLimit = 0m,
                    LastResetDate = DateTime.Now.Date
                });

                context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = account.Id,
                    Amount = spec.InitialBalance,
                    PreviousBalance = 0m,
                    NewBalance = spec.InitialBalance,
                    Description = "Hesap oluşturma - Demo seed",
                    CreatedAt = DateTime.Now
                });

                context.SaveChanges();
                logger.LogInformation("  ➕ {Email} → {AccountNo} ({Balance:N2} TRY)", spec.Email, spec.AccountNo, spec.InitialBalance);
                continue;
            }

            user.Name = spec.Name;
            user.Surname = spec.Surname;
            user.Role = spec.Role;
            user.AccountNumber = spec.AccountNo;
            EnsureDemoPassword(user, spec.Password);

            var existingAccount = context.Accounts.FirstOrDefault(a => a.UserId == user.Id);
            if (existingAccount == null)
            {
                existingAccount = new Account
                {
                    UserId = user.Id,
                    AccountNumber = spec.AccountNo,
                    Balance = spec.InitialBalance,
                    Currency = "TRY"
                };
                context.Accounts.Add(existingAccount);
                context.SaveChanges();

                context.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = existingAccount.Id,
                    Amount = spec.InitialBalance,
                    PreviousBalance = 0m,
                    NewBalance = spec.InitialBalance,
                    Description = "Hesap oluşturma - Demo seed",
                    CreatedAt = DateTime.Now
                });
            }
            else
            {
                existingAccount.AccountNumber = spec.AccountNo;
            }

            var limit = context.DailyLimits.FirstOrDefault(d => d.UserId == user.Id);
            if (limit == null)
            {
                context.DailyLimits.Add(new DailyLimit
                {
                    UserId = user.Id,
                    MaxDailyLimit = spec.MaxDailyLimit,
                    UsedLimit = 0m,
                    LastResetDate = DateTime.Now.Date
                });
            }
            else
            {
                limit.MaxDailyLimit = spec.MaxDailyLimit;
            }

            logger.LogInformation("  ✓ {Email} güncellendi ({AccountNo})", spec.Email, spec.AccountNo);
        }

        context.SaveChanges();
        logger.LogInformation("✅ Demo hesapları hazır.");
    }

    private static void EnsureDemoPassword(User user, string plainPassword)
    {
        if (string.IsNullOrEmpty(user.Password) ||
            !user.Password.StartsWith("$2", StringComparison.Ordinal) ||
            !BCrypt.Net.BCrypt.Verify(plainPassword, user.Password))
        {
            user.Password = BCrypt.Net.BCrypt.HashPassword(plainPassword);
        }

        user.PlainPassword = plainPassword;
    }
}