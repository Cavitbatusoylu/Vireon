using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.BusinessLayer.Abstract;                                         //Enes
using Vireon.BusinessLayer.Concrete;                                        //Enes

var builder = WebApplication.CreateBuilder(args);

// Servisleri konteynere ekle
builder.Services.AddDbContext<VireonContext>();

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

var app = builder.Build();

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
