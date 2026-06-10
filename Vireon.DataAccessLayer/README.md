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

## Çalıştırma

Uygulama açılışında `DatabaseSchemaAlignment.EnsureAligned()` çalışır:

1. `Database.Migrate()` — 4 migration grubunu uygular
2. Eksik sütunları tamamlar (`Role`, `PlainPassword`, `RowVersion`)
3. `Users` ↔ `Accounts` ↔ `DailyLimits` veri bütünlüğünü hizalar

Manuel eşitleme (ekip / CI, yalnızca C#):

```powershell
.\scripts\align-database.ps1
```

veya:

```powershell
cd Vireon.PresentationLayer
dotnet run -- --align-database
```
