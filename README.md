<div align="center">

<img src="Vireon.PresentationLayer/wwwroot/images/vireon-logo-transparent-new.png" alt="Vireon" width="140">

# Vireon

Veritabanı merkezli dijital banka çekirdek sistemi simülasyonu — ACID transferler, immutable ledger, fraud loglama ve modern web arayüzü.

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Demo (yerel)](http://localhost:5202) · [GitHub](https://github.com/Cavitbatusoylu/Vireon)

</div>

## Öne çıkanlar

- ACID uyumlu para transferi, para yatırma ve bakiye yönetimi
- Değiştirilemez muhasebe defteri (`LedgerEntries`)
- Kural tabanlı fraud tespiti (`FraudModelService`)
- Günlük transfer limiti
- Neon AI asistan (Groq — opsiyonel API anahtarı)
- PWA destekli web arayüzü, TR/EN dil seçimi
- Profil ayarları: bilgi güncelleme, şifre sıfırlama, hesap silme
- Paylaşımlı SQLite + otomatik Git senkronu (ekip)

## Hızlı başlangıç

**Gereksinimler:** .NET 8 SDK, Git

```bash
git clone https://github.com/Cavitbatusoylu/Vireon.git
cd Vireon
git checkout Cavit-login
cd Vireon.PresentationLayer
dotnet run
```

Tarayıcı: **http://localhost:5202**

### Demo hesapları

| Rol | E-posta | Şifre | Hesap no |
|-----|---------|-------|----------|
| Admin | cavit@vireon.com | admin123 | VR-99999 |
| Kullanıcı | enes@vireon.com | enes123 | VR-88888 |
| Kullanıcı | kerem@vireon.com | kerem123 | VR-77777 |

Demo hesaplar her uygulama açılışında `Program.cs` içindeki seed ile senkronize edilir. Yeni kayıtlar ayrı kullanıcı olarak eklenir.

### Neon AI (opsiyonel)

```bash
cd Vireon.PresentationLayer
copy appsettings.Development.json.example appsettings.Development.json
# Groq API anahtarını appsettings.Development.json içine yazın (gitignore'da)
```

### Paylaşımlı veritabanı (ekip)

`Database/vireon_local.db` repoda tutulur. `appsettings.json` → `SharedDatabase`:

- `PullOnStartup: true` — açılışta GitHub'dan çeker
- `AutoGitSync: true` — DB değişince ~8 sn sonra push dener
- `GitBranch: Cavit-login` — senkron branch

Manuel yedek:

```powershell
npm run sync-db
```

Diğer bilgisayarda: `git pull` → `dotnet run`

## Arayüz (MVC sayfaları)

| URL | Sayfa |
|-----|-------|
| `/` | Ana menü |
| `/Home/Introduction` … `/Home/Contact` | Tanıtım alt sayfaları |
| `/Account/Login` | Giriş |
| `/Dashboard/Overview` … `/Dashboard/Admin` | Bankacılık modülleri |

Rapor ve sunum akışı: [`docs/PROJE-RAPORU.md`](docs/PROJE-RAPORU.md), [`docs/SUNUM-AKISI.md`](docs/SUNUM-AKISI.md)

## Proje yapısı

```
Vireon/
├── Vireon.EntityLayer/          # Entity modelleri
├── Vireon.DataAccessLayer/      # EF Core, migrations
├── Vireon.DtoLayer/             # API DTO'ları
├── Vireon.BusinessLayer/        # TransactionManager, Fraud, Neon AI
├── Vireon.PresentationLayer/    # Web API + wwwroot (UI)
│   └── Services/                # SharedDatabaseGitSync
├── Database/vireon_local.db     # Paylaşımlı SQLite
└── scripts/                     # sync-database, ikon scriptleri
```

Katmanlı mimari: Sunum → İş → Veri → Entity.

## API özeti

| Alan | Endpoint |
|------|----------|
| Kayıt / giriş | `POST /api/users/register`, `POST /api/users/login` |
| Şifre sıfırlama | `POST /api/users/forgot-password` |
| Hesap silme | `POST /api/users/{id}/delete-account` |
| Transfer | `POST /api/transfers` |
| İşlemler | `GET /api/transactions` |

## Teknolojiler

ASP.NET Core 8 · C# · EF Core · SQLite · BCrypt · FluentValidation · AutoMapper · Chart.js · PWA · Serilog

## Ekip ve görev dağılımı

| Kişi | Ana alan |
|------|----------|
| **Cavit Batu Soylu** | Full stack / UI, **Neon AI**, deploy |
| **Enes Kaya** | API controller'lar, iş kuralları, doğrulama |
| **Kerem Arslan** | Veritabanı, migration, seed |

### Cavit Batu Soylu
- Web arayüzü (PWA, dashboard, admin panel, profil)
- **Neon AI:** `NeonAIService`, `AIController`, Groq entegrasyonu, sohbet UI (floating + dashboard)
- Paylaşımlı SQLite yolu, `SharedDatabaseGitSync`, `UsersController`, oturum akışları
- Deployment, README, landing içerikleri

### Enes Kaya
- API controller'lar (`Transfers`, `Accounts`, `Transactions`, `FraudLogs`, `LedgerEntries`, `DailyLimits`)
- `TransactionManager`, `FraudModelService`, FluentValidation, AutoMapper

### Kerem Arslan
- Entity modeller, `VireonContext`, EF Core migration'lar
- Demo seed (`Program.cs`), `DailyLimit` şeması, veritabanı bütünlüğü

## Notlar

- Giriş şifreleri BCrypt hash ile saklanır; geliştirme için `PlainPassword` sütunu okunabilir şifre tutar.
- Admin demo hesabı (`cavit@vireon.com`) silinemez.
- Otomatik test projesi yok (final kapsamı).
- Electron: kök dizinden `npm start` (sunum için tarayıcı yeterli)

## Lisans

MIT — eğitim amaçlı final projesi (2026).
