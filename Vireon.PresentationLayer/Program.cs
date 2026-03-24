using Vireon.DataAccessLayer.Concrete.EntityFramework;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container. (Servisleri konteynere ekle)
builder.Services.AddDbContext<VireonContext>(); // Veritabanı bağlamını servis olarak ekler

builder.Services.AddControllers().AddJsonOptions(options => // Denetleyicileri (Controllers) ekler ve JSON döngülerini engeller
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer(); // API uç noktaları için keşif aracını ekler
builder.Services.AddSwaggerGen(); // Swagger belgelerini oluşturur

var app = builder.Build();

// Configure the HTTP request pipeline. (HTTP istek boru hattını yapılandır)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Swagger JSON uç noktasını etkinleştirir
    app.UseSwaggerUI(); // Swagger arayüzünü etkinleştirir
}

app.UseDefaultFiles(); // Varsayılan dosyaları (index.html vb.) kullanır
app.UseStaticFiles(); // Statik dosyaları (wwwroot) kullanır

app.UseHttpsRedirection(); // HTTP isteklerini HTTPS'e yönlendirir

app.UseAuthorization(); // Yetkilendirme mekanizmasını etkinleştirir

app.MapControllers(); // Denetleyici yönlendirmelerini eşleştirir

app.Run(); // Uygulamayı başlatır


