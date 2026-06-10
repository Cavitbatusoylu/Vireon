using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Vireon.BusinessLayer.Abstract;
using Vireon.BusinessLayer.Concrete;
using Vireon.DataAccessLayer;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.DataAccessLayer.Seeding;
using Vireon.PresentationLayer.Extensions;
using Vireon.PresentationLayer.Middleware;
using Vireon.PresentationLayer.Services;

internal class Program
{
    private static void Main(string[] args)
    {
        if (args.Any(a => string.Equals(a, "--align-database", StringComparison.OrdinalIgnoreCase)))
            Environment.Exit(DatabaseAlignmentCli.Run(AppContext.BaseDirectory));

        var builder = WebApplication.CreateBuilder(args);

        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .WriteTo.Console()
            .WriteTo.File("../tools/logs/vireon-.log", rollingInterval: RollingInterval.Day)
            .CreateLogger();

        builder.Host.UseSerilog();

        builder.Services.AddDbContext<VireonContext>((serviceProvider, options) =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var rawConnection = configuration.GetConnectionString("VireonDB") ?? "Data Source=../Database/vireon_local.db";

            var csb = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(rawConnection);
            if (!string.IsNullOrWhiteSpace(csb.DataSource) && !Path.IsPathRooted(csb.DataSource))
                csb.DataSource = SqlitePathResolver.ResolveSharedDbPath(builder.Environment.ContentRootPath, csb.DataSource);

            options.UseSqlite(csb.ConnectionString);
        });

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
        });

        builder.Services.AddControllersWithViews()
            .AddJsonOptions(options =>
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

        builder.Services.AddAutoMapper(config =>
        {
            config.AddProfile<Vireon.PresentationLayer.Mappings.VireonMappingProfile>();
        });

        builder.Services.AddValidatorsFromAssemblyContaining<Vireon.PresentationLayer.Validators.TransferRequestDtoValidator>();
        builder.Services.AddScoped<ITransactionService, TransactionManager>();
        builder.Services.AddScoped<IUserService, UserService>();
        builder.Services.Configure<NeonAIOptions>(builder.Configuration.GetSection("NeonAI"));
        builder.Services.AddHttpClient<NeonAIService>();
        builder.Services.AddSingleton<FraudModelService>();

        var app = builder.Build();
        var isDevelopment = app.Environment.IsDevelopment();

        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            try
            {
                var context = services.GetRequiredService<VireonContext>();
                var logger = services.GetRequiredService<ILogger<Program>>();
                var configuration = services.GetRequiredService<IConfiguration>();

                logger.LogInformation("Database bağlantısı kontrol ediliyor...");
                DatabaseSchemaAlignment.EnsureAligned(context, logger);

                var dbPath = context.Database.GetDbConnection().DataSource;
                logger.LogInformation("📂 Paylaşımlı SQLite: {DbPath}", dbPath);

                var resetDemoIds = configuration.GetValue<bool>("SharedDatabase:ResetDemoIdsOnStartup");
                DatabaseSeeder.Seed(context, logger, resetDemoIds);
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "❌ Database oluşturulurken hata: {Message}", ex.Message);
                logger.LogWarning("⚠️ Lütfen SQLite connection string'inin (VireonDB) doğru olduğundan ve dosya yolunun yazılabilir olduğundan emin olun.");
            }
        }

        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Vireon API v1");
            c.RoutePrefix = "swagger";
        });

        app.UseMiddleware<ErrorHandlingMiddleware>();
        app.UseVireonSecurityHeaders();
        app.UseVireonCaching(isDevelopment);
        app.UseCors("AllowAll");
        app.UseRouting();
        app.UseVireonApiLogging();
        app.UseVireonHtmlCharset();
        app.UseStaticFiles();
        app.UseAuthorization();

        app.MapControllerRoute(
            name: "default",
            pattern: "{controller=Home}/{action=Index}/{id?}");
        app.MapControllers();

        app.Run();
    }
}
