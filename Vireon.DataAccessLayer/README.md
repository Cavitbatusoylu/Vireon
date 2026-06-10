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

Uygulama açılışında `Program.cs` otomatik `Database.Migrate()` çalıştırır.
