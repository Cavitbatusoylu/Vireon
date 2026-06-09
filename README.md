<div align="center">

<img src="Vireon.PresentationLayer/wwwroot/images/vireon-logo-transparent-new.png" alt="Vireon" width="140">

# Vireon

Veritabanı merkezli dijital banka çekirdek sistemi simülasyonu — ACID transferler, immutable ledger, fraud loglama ve modern web arayüzü.

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Demo (yerel)](http://localhost:5202) · [Sunum senaryosu](DEMO.md) · [Veritabanı dokümantasyonu](DATABASE_DOCUMENTATION.md)

</div>

## Öne çıkanlar

- ACID uyumlu para transferi ve bakiye yönetimi
- Değiştirilemez muhasebe defteri (`LedgerEntries`)
- Kural tabanlı fraud tespiti (`FraudModelService`)
- Günlük limit kontrolü
- Neon AI asistan (Groq — opsiyonel API anahtarı)
- PWA destekli web arayüzü, TR/EN dil seçimi

## Hızlı başlangıç

**Gereksinimler:** .NET 8 SDK, Git (opsiyonel: Node.js — Electron)

```bash
git clone https://github.com/Cavitbatusoylu/Vireon.git
cd Vireon/Vireon.PresentationLayer
dotnet run
```

Tarayıcı: **http://localhost:5202**

Demo hesapları ve adım adım sunum akışı için → [DEMO.md](DEMO.md)

### Neon AI (opsiyonel)

```bash
cd Vireon.PresentationLayer
copy appsettings.Development.json.example appsettings.Development.json
# Groq API anahtarını appsettings.Development.json içine yazın (gitignore'da)
```

### Paylaşımlı veritabanı (ekip)

Veri değişikliğinden sonra:

```powershell
npm run sync-db
```

Diğer bilgisayarda: `git pull` → `dotnet run`

## Proje yapısı

```
Vireon/
├── Vireon.EntityLayer/          # Entity modelleri
├── Vireon.DataAccessLayer/      # EF Core, migrations
├── Vireon.DtoLayer/             # API DTO'ları
├── Vireon.BusinessLayer/        # TransactionManager, Fraud, Neon AI
├── Vireon.PresentationLayer/    # Web API + wwwroot (UI)
├── Database/vireon_local.db     # Paylaşımlı SQLite
├── scripts/                     # sync-database, ikon scriptleri
├── DEMO.md
└── DATABASE_DOCUMENTATION.md
```

Katmanlı mimari: Sunum → İş → Veri → Entity. Ayrı microservice yok.

## Teknolojiler

ASP.NET Core 8 · C# · EF Core · SQLite · FluentValidation · AutoMapper · Chart.js · PWA · Electron (opsiyonel)

## Ekip

| Kişi | Alan |
|------|------|
| Cavit Batu Soylu | Full stack / UI, deploy |
| Enes Kaya | API, iş kuralları, servisler |
| Kerem Arslan | Veritabanı, migration, seed |

## Notlar

- Otomatik test projesi yok (final kapsamı).
- Şema, seed ve tablo detayları → [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md)
- Electron: `dotnet run` sonrası kök dizinden `npm start` (sunum için tarayıcı yeterli)

## Lisans

MIT — eğitim amaçlı final projesi (2026).

Proje: [github.com/Cavitbatusoylu/Vireon](https://github.com/Cavitbatusoylu/Vireon)
