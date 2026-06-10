# Vireon.DataAccessLayer — Veri Erişimi ve Migration'lar

## DbContext

```
Vireon.DataAccessLayer/Concrete/EntityFramework/VireonContext.cs
```

## EF Core Migration dosyaları (hocaya gönderilen şema evrimi)

```
Vireon.DataAccessLayer/Migrations/
├── 20260419122318_InitialCreate.cs      — 6 temel tablo
├── 20260510085037_AddRowVersion.cs     — Account concurrency token
├── 20260510095002_AddUserRole.cs       — Users.Role (Admin/User)
├── 20260605143000_AddPlainPassword.cs  — Demo şifre sütunu
├── VireonContextModelSnapshot.cs       — Güncel şema özeti
└── MigrationCatalog.cs                 — Migration grupları açıklaması
```

## Seed ve yardımcılar

```
Vireon.DataAccessLayer/
├── SqlitePathResolver.cs       — Paylaşımlı DB dosya yolu
├── DatabaseAlignmentCli.cs     — dotnet run -- --align-database
├── DatabaseSchemaAlignment.cs  — Migration + şema eşitleme
└── Seeding/DatabaseSeeder.cs   — Demo hesaplar, şifre hash, test kullanıcı temizliği
```

## Migration vs Alignment

| Mekanizma | Amaç |
|-----------|------|
| **EF Core Migration** (`Migrations/`) | Resmi şema evrimi — hocanın görmek istediği yapı |
| **DatabaseSchemaAlignment** | `Migrate()` sonrası demo/ekip senkronu için güvenlik ağı (eksik sütun, ilişki hizası) |
| **DatabaseSeeder** | Demo hesaplar, şifre hash, başlangıç verisi |

Migration kalıcı ve versiyonlanmış kayıttır; alignment yalnızca çalışma zamanında tutarlılığı garanti eder.

## Çalıştırma

`PresentationLayer/Program.cs` yalnızca şunları çağırır:

1. `DatabaseSchemaAlignment.EnsureAligned()` — migrate + şema
2. `DatabaseSeeder.Seed()` — demo kullanıcılar ve veri senkronu

Manuel eşitleme (ekip / CI, yalnızca C#):

```powershell
.\tools\scripts\align-database.ps1
```

veya:

```powershell
cd Vireon.PresentationLayer
dotnet run -- --align-database
```
