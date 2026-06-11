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
            options.UseSqlServer(connectionString);
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

                logger.LogInformation("✅ Database hazır! Seed data yüklendi.");
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

        app.UseCors("AllowAll");

        app.UseDefaultFiles();
        app.UseStaticFiles();

        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}