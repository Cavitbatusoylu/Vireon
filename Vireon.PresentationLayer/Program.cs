using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.BusinessLayer.Abstract;
using Vireon.BusinessLayer.Concrete;

internal class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Servisleri konteynere ekle
        builder.Services.AddDbContext<VireonContext>((serviceProvider, options) =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var connectionString = configuration.GetConnectionString("VireonDB");
            options.UseSqlite(connectionString);
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
        builder.Services.AddSwaggerGen();

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

        var app = builder.Build();

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

                logger.LogInformation("✅ Database hazır!");
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "❌ Database oluşturulurken hata: {Message}", ex.Message);
                logger.LogWarning("⚠️ Lütfen SQL Server'ın çalıştığından ve connection string'in doğru olduğundan emin olun.");
            }
        }

        // Swagger arayüzü (Geliştirme ortamında aktif)
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

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
        // CACHE KONTROL — CTRL+F5 SORUNUNU ÇÖZER
        // Statik dosyalar (HTML/JS/CSS) için cache devre dışı bırakılır
        // ============================================================
        app.Use(async (context, next) =>
        {
            var path = context.Request.Path.Value ?? "";
            if (path.EndsWith(".html") || path.EndsWith(".js") || path.EndsWith(".css") || path == "/")
            {
                context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                context.Response.Headers["Pragma"] = "no-cache";
                context.Response.Headers["Expires"] = "0";
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
}