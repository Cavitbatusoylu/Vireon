<br/>
<div align="center">
<a href="https://github.com/Cavitbatusoylu/Vireon">
<img src="Vireon.PresentationLayer/wwwroot/images/vireon-logo-transparent-new.png" alt="Logo" width="180" height="auto">
</a>

# Vireon - Immutable Ledger
### Enterprise-Grade Digital Banking Core System

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)
[![Entity Framework](https://img.shields.io/badge/EF%20Core-8.0-512BD4?style=for-the-badge)](https://docs.microsoft.com/ef/core)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)](http://localhost:5202)

**Production-grade, database-centric digital banking core system demonstrating enterprise-level financial transaction management with ACID compliance, immutable ledger architecture, AI-powered fraud detection, and modern fintech UI/UX.**

[🚀 Demo (yerel)](http://localhost:5202) • [📋 Sunum senaryosu](DEMO.md) • [📖 Documentation](#-proje-hakkında) • [🎯 Features](#-temel-özellikler) • [🏗️ Architecture](#-proje-yapısı-ve-mimari) • [🔐 Security](#-güvenlik-ve-uyumluluk)

---

</div>

<br/>

## 🌟 Proje Hakkında

**Vireon**, finansal işlemlerin güvenli, tutarlı ve izlenebilir biçimde yönetilmesini sağlayan, veritabanı merkezli bir dijital banka çekirdek sistemi simülasyonudur. Proje; para transferi, hesap yönetimi, günlük limit kontrolü, fraud analizi ve immutable muhasebe defteri mantığını uygulayarak gerçek bankacılık sistemlerinin çekirdek işlem mekanizmasını teknik olarak modellemektedir.

### 🎯 Temel Özellikler

- ✅ **ACID Transaction**: Tüm finansal işlemler atomik, tutarlı, izole ve kalıcı
- ✅ **Immutable Ledger**: Değişmez muhasebe defteri - kayıtlar silinemez
- ✅ **Fraud Detection**: Gerçek zamanlı kural tabanlı risk analizi (deterministik risk motoru)
- ✅ **Daily Limits**: Günlük işlem limiti kontrolü ve otomatik sıfırlama
- ✅ **Modern UI/UX**: Responsive, PWA destekli web arayüzü
- ✅ **AI Integration**: Neon AI Coach (Groq API - Llama 3.1)
- ✅ **Real-time Charts**: Canlı bakiye ve işlem grafikleri (Chart.js)
- ✅ **QR Payment**: QR kod ile ödeme sistemi
- ✅ **Multi-language**: Türkçe/İngilizce dil desteği
- ✅ **Electron Desktop (opsiyonel)**: Masaüstü kabuk — sunumda zorunlu değil; API çalışırken `npm start`

### 📊 Sistem Metrikleri

```
📈 Performans            🔒 Güvenlik              💾 Veri Bütünlüğü
├─ <100ms API yanıt      ├─ HTTPS zorunlu         ├─ ACID uyumlu
├─ Gerçek zamanlı        ├─ SQL injection korumalı├─ Immutable ledger
└─ Eşzamanlı kullanıcı   ├─ XSS korumalı          └─ Tam denetim izi
                         └─ Input validasyon
```

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

---

## 🚀 Teknoloji Stack ve Altyapı

Vireon, enterprise-grade performans ve güvenilirlik için modern teknolojiler kullanır:

### 🔧 Backend Stack

| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| **ASP.NET Core** | 8.0 | Web API Framework |
| **C#** | 12 | Primary Language |
| **Entity Framework Core** | 8.0 | ORM & Database Access |
| **SQLite** | 3 | Embedded Primary Database |
| **FluentValidation** | Latest | Input Validation |
| **AutoMapper** | Latest | Object Mapping |
| **Rule-based Engine** | - | Deterministic Fraud Detection |

### 🎨 Frontend Stack

| Teknoloji | Kullanım Amacı |
|-----------|----------------|
| **HTML5 / CSS3** | Modern UI Structure |
| **JavaScript (ES6+)** | Client-side Logic |
| **Chart.js** | Real-time Analytics |
| **Service Worker** | PWA Functionality |
| **Glass-morphism** | Modern Design System |

### 🖥️ Desktop & Infrastructure

| Teknoloji | Kullanım Amacı |
|-----------|----------------|
| **Electron (opsiyonel)** | Masaüstü kabuk — demo için web yeterli |
| **Node.js** | Desktop Runtime |
| **Cloudflare Tunnel** | Secure Deployment |
| **Git & GitHub** | Version Control |

### 🔑 Key Technical Features

* ✅ **ACID Transactions:** Database-level transaction management with automatic rollback
* ✅ **Immutable Ledger:** Append-only financial records for complete audit trail
* ✅ **Fraud Detection:** Rule-based risk analysis; şüpheli işlemler loglanır (işlem engellenmez, admin panelinde görünür)
* ✅ **AI Integration:** Groq API (Llama 3.1) for banking assistance
* ✅ **Real-time Updates:** Live balance and transaction tracking
* ✅ **PWA Support:** Installable web application
* ✅ **Multi-language:** Turkish/English support

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 📂 Proje Yapısı ve Mimari

Vireon, katmanlı mimari (N-Tier Architecture) prensiplerine göre tasarlanmıştır:

```plaintext
Vireon/
├── Vireon.EntityLayer/           # 📦 Entity Models (Database Models)
│   └── Concrete/
│       ├── User.cs               # Kullanıcı modeli
│       ├── Account.cs            # Hesap modeli
│       ├── Transaction.cs        # İşlem modeli
│       ├── LedgerEntry.cs        # Muhasebe defteri
│       ├── DailyLimit.cs         # Günlük limit
│       └── FraudLogs.cs          # Fraud kayıtları
│
├── Vireon.DataAccessLayer/       # 🗄️ Data Access Layer
│   ├── Concrete/EntityFramework/
│   │   └── VireonContext.cs      # DbContext (EF Core)
│   └── Migrations/               # Database migrations
│
├── Vireon.DtoLayer/              # 📋 Data Transfer Objects
│   └── DTOs/                     # API request/response models
│
├── Vireon.BusinessLayer/         # 💼 Business Logic Layer
│   ├── Abstract/
│   │   └── ITransactionService.cs
│   └── Concrete/
│       ├── TransactionManager.cs  # ACID transaction yönetimi
│       ├── FraudModelService.cs   # Fraud detection
│       └── NeonAIService.cs       # AI entegrasyonu (Groq)
│
├── Vireon.PresentationLayer/    # 🎨 Presentation Layer (Web UI)
│   ├── Controllers/              # API Controllers
│   ├── wwwroot/                  # Static files
│   │   ├── index.html            # Ana sayfa
│   │   ├── vireon.css            # Stil dosyası
│   │   ├── vireon.js             # JavaScript
│   │   ├── sw.js                 # Service Worker (PWA)
│   │   ├── manifest.json         # PWA manifest
│   │   └── images/               # Görseller
│   ├── Program.cs                # Application entry point
│   └── appsettings.json          # Configuration
│
├── Database/                     # 🗃️ Paylaşımlı SQLite (vireon_local.db)
├── DATABASE_DOCUMENTATION.md     # Migration & seed (Kerem)
├── DEMO.md                       # Sunum senaryosu & demo hesapları
└── Vireon.slnx                   # Solution file
```

### 🏗️ Mimari Katmanlar

#### 1. Presentation Layer (Sunum Katmanı)
- ASP.NET Core Web API
- Modern web UI (HTML/CSS/JS)
- RESTful API endpoints
- PWA desteği

#### 2. Business Layer (İş Mantığı Katmanı)
- `TransactionManager` — ACID transfer, ledger, limit
- `FraudModelService` — kural tabanlı risk (log)
- `NeonAIService` — bankacılık asistanı
- Ayrı microservice yok; hesap/fraud/defter mantığı controller + manager içinde

#### 3. Data Access Layer (Veri Erişim Katmanı)
- Entity Framework Core
- Repository Pattern
- DbContext yönetimi
- Database migrations

#### 4. Entity Layer (Varlık Katmanı)
- Database models
- Navigation properties
- Data annotations

#### 5. DTO Layer (Veri Transfer Katmanı)
- API request/response models
- Data mapping
- Validation rules

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 🛠️ Kurulum ve Çalıştırma

### Gereksinimler
- .NET 8.0 SDK
- Visual Studio 2022 veya VS Code
- Git
- (Opsiyonel) Masaüstü uygulaması için Node.js + Electron

> SQLite gömülü (embedded) bir veritabanı olduğu için ayrı bir veritabanı sunucusu kurmaya gerek yoktur.

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/Cavitbatusoylu/Vireon.git
cd Vireon
```

### 2. Veritabanı Bağlantısı (Yapılandırma Gerekmez)
Bağlantı `Vireon.PresentationLayer/appsettings.json` içinde hazır olarak gelir ve SQLite dosyasını işaret eder:

```json
{
  "ConnectionStrings": {
    "VireonDB": "Data Source=../Database/vireon_local.db"
  }
}
```

Veritabanı dosyası repoda bulunur; isterseniz silip ilk çalıştırmada sıfırdan oluşturabilirsiniz.

### 2b. Neon AI (Groq) API anahtarı

Anahtar **repoya yazılmaz**. Yerel geliştirme için:

```bash
cd Vireon.PresentationLayer
copy appsettings.Development.json.example appsettings.Development.json
# appsettings.Development.json içine Groq API anahtarınızı yazın (gitignore'da)
```

Alternatif: ortam değişkeni `NeonAI__ApiToken` (veya `NEONAI__APITOKEN`).

> Daha önce repoda düz metin anahtar varsa [Groq Console](https://console.groq.com/) üzerinden **rotate** edin.

### 3. Projeyi Çalıştırın
```bash
cd Vireon.PresentationLayer
dotnet run
```

**ÖNEMLİ:** Database otomatik hazırlanır! İlk çalıştırmada:
- SQLite dosyası yoksa oluşturulur, migration'lar uygulanır
- Tüm tablolar oluşturulur
- Seed data eklenir (Ana Admin `cavit@vireon.com` ve `enes@vireon.com`)

Tarayıcınızda **http://localhost:5202** adresini açın.

### 4. İlk Kullanıcıyı Kaydet
API: `POST /api/users/register`
```json
{
  "name": "Ahmet",
  "surname": "Yılmaz",
  "email": "ahmet@test.com",
  "password": "123456"
}
```

Kayıt olunca otomatik:
- Hesap oluşturulur (VR-0001 formatında)
- Günlük limit atanır (50.000 TRY)
- Bakiye 0 TRY başlar

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 📊 Database Şeması

Detaylı database dokümantasyonu için: [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md)

### Tablolar
- **Users**: Kullanıcı bilgileri
- **Accounts**: Banka hesapları
- **Transactions**: Para transferleri
- **LedgerEntries**: Immutable muhasebe defteri
- **DailyLimits**: Günlük işlem limitleri
- **FraudLogs**: Fraud detection kayıtları

### İlişkiler
- Users `1:N` Accounts
- Users `1:1` DailyLimits
- Accounts `1:N` Transactions (Sender/Receiver)
- Accounts `1:N` LedgerEntries
- Accounts `1:N` FraudLogs

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 🎯 Özellikler

### 💰 Para Transferi
- ACID transaction garantisi
- Bakiye kontrolü
- Günlük limit kontrolü
- Fraud detection
- Immutable ledger kaydı

### 📊 Dashboard
- Gerçek zamanlı bakiye
- İşlem geçmişi
- Grafik ve istatistikler
- Hesap özeti

### 🛡️ Güvenlik
- Şifre hash'leme
- ACID transaction
- Fraud detection
- Daily limit kontrolü
- Immutable audit trail

### 🤖 AI Integration
- Neon AI Coach (Groq API)
- Llama 3.1 8B entegrasyonu
- Doğal dil işleme
- Bankacılık asistanı

### 📱 Modern UI
- Responsive tasarım
- PWA desteği
- Toast notifications
- Dark/Light theme
- Çok dilli (TR/EN)

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 👥 Ekip ve Sorumluluklar

### Cavit Batu Soylu
**Rol:** Full Stack / Frontend  
**Sorumluluklar:**
- Modern web UI (`wwwroot`: HTML/CSS/JS, PWA)
- `TransactionManager` ile ACID transfer akışı (iş birliği)
- Paylaşımlı SQLite yolu (`ResolveSharedDbPath`, `Database/`)
- Admin paneli, DB Explorer, deploy notları

### Enes Kaya
**Rol:** Backend Developer  
**Sorumluluklar:**
- API Controller'lar (Users, Transfers, Transactions, FraudLogs, Ledger, AI, …)
- `TransactionManager`, `FraudModelService`, `NeonAIService`
- FluentValidation, AutoMapper, iş kuralları
- Ayrı Account/Fraud/Ledger **servis projeleri yok** — tek solution, katmanlı mimari

### Kerem Arslan
**Rol:** Database Specialist  
**Sorumluluklar:**
- Entity modeller, `VireonContext`
- EF Core migration'lar (`Vireon.DataAccessLayer/Migrations`)
- Seed ve şema ([DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md))
- `DailyLimit` entity ve ilişkiler

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 📚 Ek Dokümantasyon

| Dosya | İçerik |
|-------|--------|
| [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md) | Migration listesi, seed, tablolar (Kerem) |
| [DEMO.md](DEMO.md) | Demo URL, hesaplar, ~10 dk sunum akışı |

## 🧪 Otomatik Testler

Projede **ayrı bir test projesi (xUnit/NUnit) yoktur** — final teslim kapsamında bilinçli olarak çıkarılmıştır. Doğrulama: `dotnet build`, manuel UI/API akışı ve [DEMO.md](DEMO.md) kontrol listesi.

## 🖥️ Electron (Opsiyonel)

```bash
cd Vireon.PresentationLayer && dotnet run   # önce API: http://localhost:5202
npm install && npm start                    # kök dizinden — masaüstü kabuk
```

Sunum için tarayıcıda **http://localhost:5202** yeterlidir.

## 🎬 Demo ve Sunum

1. `dotnet run` → **http://localhost:5202**
2. Admin: `cavit@vireon.com` / `admin123` — kullanıcı: `enes@vireon.com` / `enes123`
3. Adım adım akış: [DEMO.md](DEMO.md)

**Cloudflare Tunnel (opsiyonel):** `cloudflared tunnel --url http://localhost:5202` — URL her oturumda değişebilir; birincil demo yerel porttur.

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 🤝 Git Çalışma Akışı (Workflow)

Projeyi sağlıklı yürütmek için aşağıdaki adımları takip ediyoruz:

### 👤 1. Geliştiriciler İçin
Kendi bilgisayarınızda yaptığınız değişiklikleri şu şekilde gönderin:

```bash
# 1. Değişiklikleri pakete ekle
git add .

# 2. Yapılan işi özetle
git commit -m "feat: login sayfası tasarımı eklendi"

# 3. Kendi şubene (branch) gönder
git push origin feature/your-feature-name
```

### 👑 2. Proje Sahibi / Yönetici İçin
Gelen değişiklikleri terminalden kontrol edip ana projeye (main) katmak için:

```bash
# 1. GitHub'daki yeni değişiklikleri tanı
git fetch origin

# 2. Feature branch'i main ile birleştir (Merge)
git merge origin/feature/your-feature-name

# 3. Güncellenmiş main dalını GitHub'a geri gönder
git push origin main
```

> [!TIP]
> Eğer merge sırasında "Conflict" (çakışma) uyarısı alırsanız, çakışan dosyaları Visual Studio üzerinden açıp hangi kodun kalacağını seçerek kaydedin, sonra tekrar `add/commit/push` yapın.

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 📈 Proje İstatistikleri

- **Toplam Kod Satırı:** ~15,000+
- **Business servisleri:** 3 (`TransactionManager`, `FraudModelService`, `NeonAIService`)
- **API Endpoints:** 25+
- **Database Tabloları:** 6
- **Frontend Sayfaları:** 10+
- **Seed kullanıcıları:** 2 (detay: DEMO.md)
- **Demo:** http://localhost:5202 (birincil)

## 🎓 Eğitim Amaçlı Proje

Bu proje, Bilgisayar Mühendisliği 2. sınıf final projesi olarak geliştirilmiştir. Amaç:
- Modern web teknolojilerini öğrenmek
- Katmanlı mimari prensiplerini uygulamak
- ACID transaction yönetimini anlamak
- Fraud detection algoritmalarını geliştirmek
- Takım çalışması deneyimi kazanmak

## 📝 Lisans

Bu proje eğitim amaçlıdır ve MIT lisansı altında yayınlanmıştır.

## 📞 İletişim

Proje Sahibi: Cavit Batu Soylu  
GitHub: [@Cavitbatusoylu](https://github.com/Cavitbatusoylu)

Proje Linki: [https://github.com/Cavitbatusoylu/Vireon](https://github.com/Cavitbatusoylu/Vireon)  
Canlı Demo (yerel): [http://localhost:5202](http://localhost:5202) — sunum: [DEMO.md](DEMO.md)

---
<div align="center">
  <b>Vireon Takımı Tarafından Tutkuyla Geliştirildi ❤️</b>
  <br/>
  <em>Bilgisayar Mühendisliği Final Projesi - 2026</em>
</div>


## 🗄️ Database Yapısı

### 📊 Database Şema Diyagramı (Detaylı)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIREON DATABASE SCHEMA                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       USERS          │
├──────────────────────┤
│ 🔑 Id (PK)          │ ◄────────┐
│ 📧 Email (UNIQUE)   │          │
│ 👤 Name             │          │ 1:N
│ 👤 Surname          │          │
│ 🔐 Password         │          │
└──────────────────────┘          │
         │ 1:1                    │
         │                        │
         ▼                        │
┌──────────────────────┐          │
│    DAILY LIMITS      │          │
├──────────────────────┤          │
│ 🔑 Id (PK)          │          │
│ 🔗 UserId (FK)      │──────────┘
│ 💰 MaxDailyLimit    │
│ 📊 UsedLimit        │
│ 📅 LastResetDate    │
└──────────────────────┘


         ┌──────────────────────┐
         │      ACCOUNTS        │
         ├──────────────────────┤
         │ 🔑 Id (PK)          │ ◄────────┐
         │ 🔗 UserId (FK)      │──────────┤─────┐
         │ 🏦 AccountNumber    │          │     │
         │ 💵 Balance          │          │     │
         │ 💱 Currency         │          │     │
         └──────────────────────┘          │     │
                  │                        │     │
         ┌────────┼────────┬───────────────┘     │
         │        │        │                     │
         │ 1:N    │ 1:N    │ 1:N                │ 1:N
         ▼        ▼        ▼                     ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│TRANSACTIONS │ │LEDGER ENTRY │ │ FRAUD LOGS  │ │TRANSACTIONS │
├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤
│🔑 Id (PK)   │ │🔑 Id (PK)   │ │🔑 Id (PK)   │ │🔑 Id (PK)   │
│🔗 SenderAcct│ │🔗 AccountId │ │🔗 AccountId │ │🔗 ReceiverAc│
│🔗 ReceiverAc│ │💰 Amount    │ │⚠️ RiskType  │ │💰 Amount    │
│💰 Amount    │ │📊 PrevBal   │ │📝 Desc      │ │📅 Date      │
│📅 Date      │ │📊 NewBal    │ │📅 LogDate   │ └─────────────┘
└─────────────┘ │📝 Desc      │ └─────────────┘      (Receiver)
   (Sender)     │📅 CreatedAt │
                │🔒 IMMUTABLE │
                └─────────────┘
```

### 📋 Tablo Detayları ve İlişkiler

#### 1️⃣ Users (Kullanıcılar)
**Amaç:** Sistemdeki kullanıcı bilgilerini saklar.

| Kolon | Tip | Açıklama | Constraint |
|-------|-----|----------|------------|
| 🔑 Id | int | Benzersiz kullanıcı kimliği | PRIMARY KEY, AUTO_INCREMENT |
| 📧 Email | string | E-posta adresi | NOT NULL, UNIQUE |
| 👤 Name | string | Kullanıcı adı | NOT NULL |
| 👤 Surname | string | Kullanıcı soyadı | NOT NULL |
| 🔐 Password | string | Şifre (hash'lenmiş) | NOT NULL |

**İlişkiler:**
- `1:N` → Accounts (Bir kullanıcının birden fazla hesabı olabilir)
- `1:1` → DailyLimit (Her kullanıcının bir günlük limiti vardır)

**Navigation Properties:**
```csharp
public List<Account>? Accounts { get; set; }
public DailyLimit? DailyLimit { get; set; }
```

---

#### 2️⃣ Accounts (Hesaplar)
**Amaç:** Kullanıcıların banka hesap bilgilerini saklar.

| Kolon | Tip | Açıklama | Constraint |
|-------|-----|----------|------------|
| 🔑 Id | int | Benzersiz hesap kimliği | PRIMARY KEY, AUTO_INCREMENT |
| 🔗 UserId | int | Hesap sahibi kullanıcı | FOREIGN KEY → Users(Id) |
| 🏦 AccountNumber | string | Hesap numarası | NOT NULL, UNIQUE |
| 💵 Balance | decimal | Hesap bakiyesi | NOT NULL, DEFAULT 0, CHECK >= 0 |
| 💱 Currency | string | Para birimi (TRY, USD, EUR) | NOT NULL |

**İlişkiler:**
- `N:1` → Users (Hesap bir kullanıcıya aittir)
- `1:N` → Transactions (Sender) (Hesaptan giden transferler)
- `1:N` → Transactions (Receiver) (Hesaba gelen transferler)
- `1:N` → LedgerEntries (Hesabın muhasebe kayıtları)
- `1:N` → FraudLogs (Hesaba ait fraud kayıtları)

**Navigation Properties:**
```csharp
public User? User { get; set; }
public List<Transaction>? SentTransactions { get; set; }
public List<Transaction>? ReceivedTransactions { get; set; }
public List<FraudLog>? FraudLogs { get; set; }
public List<LedgerEntry>? LedgerEntries { get; set; }
```

---

#### 3️⃣ Transactions (İşlemler)
**Amaç:** Para transfer işlemlerini kaydeder.

| Kolon | Tip | Açıklama | Constraint |
|-------|-----|----------|------------|
| 🔑 Id | int | Benzersiz işlem kimliği | PRIMARY KEY, AUTO_INCREMENT |
| 🔗 SenderAccountId | int | Gönderici hesap | FOREIGN KEY → Accounts(Id) |
| 🔗 ReceiverAccountId | int | Alıcı hesap | FOREIGN KEY → Accounts(Id) |
| 💰 Amount | decimal | Transfer miktarı | NOT NULL, CHECK > 0 |
| 📅 Date | DateTime | İşlem tarihi | NOT NULL, DEFAULT NOW() |

**İlişkiler:**
- `N:1` → Accounts (Sender) (Gönderici hesap)
- `N:1` → Accounts (Receiver) (Alıcı hesap)

**Navigation Properties:**
```csharp
public Account? SenderAccount { get; set; }
public Account? ReceiverAccount { get; set; }
```

**İş Kuralları:**
- ✅ SenderAccountId ≠ ReceiverAccountId
- ✅ Amount > 0
- ✅ Sender.Balance >= Amount (transfer öncesi kontrol)
- ✅ ACID transaction içinde çalışır

---

#### 4️⃣ LedgerEntries (Muhasebe Defteri) 🔒
**Amaç:** Tüm hesap hareketlerinin değişmez kaydını tutar (Immutable Ledger).

| Kolon | Tip | Açıklama | Constraint |
|-------|-----|----------|------------|
| 🔑 Id | int | Benzersiz kayıt kimliği | PRIMARY KEY, AUTO_INCREMENT |
| 🔗 AccountId | int | İşlem gören hesap | FOREIGN KEY → Accounts(Id) |
| 💰 Amount | decimal | İşlem miktarı (+/-) | NOT NULL |
| 📊 PreviousBalance | decimal | İşlem öncesi bakiye | NOT NULL |
| 📊 NewBalance | decimal | İşlem sonrası bakiye | NOT NULL |
| 📝 Description | string | İşlem açıklaması | NOT NULL |
| 📅 CreatedAt | DateTime | Kayıt zamanı | NOT NULL, DEFAULT NOW() |

**İlişkiler:**
- `N:1` → Accounts (Kayıt bir hesaba aittir)

**Navigation Properties:**
```csharp
public Account? Account { get; set; }
```

**Özellikler:**
- 🔒 **IMMUTABLE:** Kayıtlar asla silinmez veya güncellenmez
- 📜 **AUDIT TRAIL:** Tüm bakiye değişiklikleri izlenebilir
- ✅ **ACID COMPLIANT:** Transaction içinde oluşturulur
- 🔍 **FORENSIC:** Geçmişe dönük analiz yapılabilir

---

#### 5️⃣ DailyLimits (Günlük Limitler)
**Amaç:** Kullanıcıların günlük işlem limitlerini yönetir.

| Kolon | Tip | Açıklama | Constraint |
|-------|-----|----------|------------|
| 🔑 Id | int | Benzersiz limit kimliği | PRIMARY KEY, AUTO_INCREMENT |
| 🔗 UserId | int | Limit sahibi kullanıcı | FOREIGN KEY → Users(Id), UNIQUE |
| 💰 MaxDailyLimit | decimal | Maksimum günlük limit | NOT NULL, DEFAULT 50000 |
| 📊 UsedLimit | decimal | Kullanılan limit | NOT NULL, DEFAULT 0 |
| 📅 LastResetDate | DateTime | Son sıfırlama tarihi | NOT NULL |

**İlişkiler:**
- `1:1` → Users (Her kullanıcının bir limiti vardır)

**Navigation Properties:**
```csharp
public User? User { get; set; }
```

**İş Kuralları:**
- ✅ UsedLimit <= MaxDailyLimit
- ✅ Her gün 00:00'da UsedLimit sıfırlanır
- ✅ Transfer öncesi limit kontrolü yapılır
- ⚠️ Limit aşımı FraudLogs'a kaydedilir

---

#### 6️⃣ FraudLogs (Fraud Kayıtları) ⚠️
**Amaç:** Şüpheli işlemleri ve risk analizlerini kaydeder.

| Kolon | Tip | Açıklama | Constraint |
|-------|-----|----------|------------|
| 🔑 Id | int | Benzersiz log kimliği | PRIMARY KEY, AUTO_INCREMENT |
| 🔗 AccountId | int | Riskli hesap | FOREIGN KEY → Accounts(Id) |
| ⚠️ RiskType | string | Risk türü | NOT NULL |
| 📝 Description | string | Risk detayı | NOT NULL |
| 📅 LogDate | DateTime | Kayıt tarihi | NOT NULL, DEFAULT NOW() |

**İlişkiler:**
- `N:1` → Accounts (Log bir hesaba aittir)

**Navigation Properties:**
```csharp
public Account? Account { get; set; }
```

**Risk Türleri:**
- 🔴 `HIGH_AMOUNT`: Yüksek miktarlı transfer (>10,000 TRY)
- 🟠 `FREQUENT_TRANSACTIONS`: Sık işlem (>10 işlem/saat)
- 🟡 `UNUSUAL_PATTERN`: Olağandışı davranış
- 🔴 `LIMIT_EXCEEDED`: Limit aşımı denemesi

---

### 🔐 Güvenlik ve Constraint'ler

#### Primary Keys
```sql
Users.Id          → AUTO_INCREMENT
Accounts.Id       → AUTO_INCREMENT
Transactions.Id   → AUTO_INCREMENT
LedgerEntries.Id  → AUTO_INCREMENT
DailyLimits.Id    → AUTO_INCREMENT
FraudLogs.Id      → AUTO_INCREMENT
```

#### Foreign Keys ve Cascade Rules
```sql
Accounts.UserId → Users.Id 
  ON DELETE CASCADE (Kullanıcı silinirse hesapları da silinir)

Transactions.SenderAccountId → Accounts.Id 
  ON DELETE RESTRICT (Hesap silinmez, işlem varsa)

Transactions.ReceiverAccountId → Accounts.Id 
  ON DELETE RESTRICT

LedgerEntries.AccountId → Accounts.Id 
  ON DELETE CASCADE

DailyLimits.UserId → Users.Id 
  ON DELETE CASCADE

FraudLogs.AccountId → Accounts.Id 
  ON DELETE CASCADE
```

#### Unique Constraints
```sql
Users.Email              → UNIQUE
Accounts.AccountNumber   → UNIQUE
DailyLimits.UserId       → UNIQUE (1:1 ilişki)
```

#### Check Constraints
```sql
Transactions.Amount > 0
Accounts.Balance >= 0
DailyLimits.UsedLimit <= MaxDailyLimit
Transactions.SenderAccountId ≠ ReceiverAccountId
```

---

### 📊 Database İstatistikleri

| Metrik | Değer |
|--------|-------|
| Toplam Tablo | 6 |
| Toplam İlişki | 8 |
| Toplam Kolon | 38 |
| Foreign Key | 6 |
| Unique Constraint | 3 |
| Check Constraint | 4 |
| Immutable Tablo | 1 (LedgerEntries) |

---

## 🌱 Test Verileri (Seed Data)

### Test Kullanıcıları

| ID | Ad | Soyad | Email | Şifre | Hesap No | Bakiye | Limit |
|----|-----|-------|-------|-------|----------|--------|-------|
| 1 | Admin | Vireon | admin@vireon.com | admin123 | TR100001 | 1,000,000 TRY | 100,000 TRY |
| 2 | Ahmet | Yılmaz | ahmet@test.com | test123 | TR100002 | 50,000 TRY | 50,000 TRY |
| 3 | Ayşe | Demir | ayse@test.com | test123 | TR100003 | 75,000 TRY | 50,000 TRY |

### Seed Data Kontrolü

```sql
-- Kullanıcı sayısı kontrolü
SELECT COUNT(*) FROM Users; -- Beklenen: 3

-- Hesap sayısı kontrolü
SELECT COUNT(*) FROM Accounts; -- Beklenen: 3

-- Limit kontrolü
SELECT COUNT(*) FROM DailyLimits; -- Beklenen: 3

-- Kullanıcı-Hesap ilişkisi
SELECT u.Name, u.Email, a.AccountNumber, a.Balance 
FROM Users u 
LEFT JOIN Accounts a ON u.Id = a.UserId;
```

### Test Senaryoları

#### Senaryo 1: Login Testi
1. `admin@vireon.com` / `admin123` ile giriş yap
2. Dashboard açılmalı
3. Bakiye: 1,000,000.00 TRY görünmeli

#### Senaryo 2: Transfer Testi
1. `ahmet@test.com` / `test123` ile giriş yap
2. Ayşe'ye (Account ID: 3) 1,000 TRY gönder
3. Transfer başarılı olmalı
4. Ahmet bakiye: 49,000 TRY
5. Ayşe bakiye: 76,000 TRY

#### Senaryo 3: Fraud Detection Testi
1. 15,000 TRY üzeri transfer yap
2. FraudLogs tablosunda kayıt oluşmalı
3. RiskType: "HIGH_AMOUNT"

---

## 🔐 ACID Transaction Örneği

```csharp
// Para transferi - ACID garantili
using (var transaction = _context.Database.BeginTransaction())
{
    try
    {
        // 1. Bakiye kontrolü
        if (senderAccount.Balance < amount)
            throw new Exception("Yetersiz bakiye");

        // 2. Limit kontrolü
        if (dailyLimit.UsedLimit + amount > dailyLimit.MaxDailyLimit)
            throw new Exception("Günlük limit aşıldı");

        // 3. Bakiye güncelleme
        senderAccount.Balance -= amount;
        receiverAccount.Balance += amount;

        // 4. Transaction kaydı
        _context.Transactions.Add(new Transaction {
            SenderAccountId = senderId,
            ReceiverAccountId = receiverId,
            Amount = amount,
            Date = DateTime.Now
        });

        // 5. Ledger kayıtları (Immutable)
        _context.LedgerEntries.Add(new LedgerEntry {
            AccountId = senderId,
            Amount = -amount,
            PreviousBalance = oldSenderBalance,
            NewBalance = senderAccount.Balance,
            Description = "Transfer gönderildi",
            CreatedAt = DateTime.Now
        });

        // 6. Limit güncelleme
        dailyLimit.UsedLimit += amount;

        // 7. Fraud kontrolü
        if (amount > 10000)
        {
            _context.FraudLogs.Add(new FraudLog {
                AccountId = senderId,
                RiskType = "HIGH_AMOUNT",
                Description = $"Yüksek miktarlı transfer: {amount}",
                LogDate = DateTime.Now
            });
        }

        // Commit - Hepsi başarılı
        _context.SaveChanges();
        transaction.Commit();
    }
    catch
    {
        // Rollback - Hata durumunda geri al
        transaction.Rollback();
        throw;
    }
}
```

---

## 🚀 Deployment

### Yerel demo (birincil)
```bash
cd Vireon.PresentationLayer
dotnet run
# → http://localhost:5202
```

### Cloudflare Tunnel (opsiyonel)
Geçici dış erişim için (URL her seferinde değişir):

```bash
cloudflared tunnel --url http://localhost:5202
```

### Production Checklist
- [x] Database migration tamamlandı
- [x] Seed data yüklendi
- [x] Manuel API/UI doğrulaması ([DEMO.md](DEMO.md))
- [x] Otomatik test projesi yok (bilinçli — final kapsamı)
- [ ] SSL sertifikası (production için)
- [ ] Domain bağlantısı (opsiyonel)

---

## 🧪 Derleme ve Veritabanı Komutları

Otomatik test projesi yoktur; aşağıdaki komutlar geliştirme ve sunum hazırlığı içindir.

```bash
# Proje derleme
dotnet build

# Migration oluştur (EF tools gerekir)
dotnet ef migrations add MigrationName --project Vireon.DataAccessLayer --startup-project Vireon.PresentationLayer

# Database güncelle
dotnet ef database update --project Vireon.DataAccessLayer --startup-project Vireon.PresentationLayer

# Projeyi çalıştır
dotnet run --project Vireon.PresentationLayer
```

---

## 📚 Ek Kaynaklar

- [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md) — şema, migration, seed
- [DEMO.md](DEMO.md) — sunum senaryosu
- [ASP.NET Core Docs](https://docs.microsoft.com/aspnet/core)
- [Entity Framework Core](https://docs.microsoft.com/ef/core)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [PWA Guide](https://web.dev/progressive-web-apps/)

---

## 🎯 Gelecek Planları

- [ ] Unit / integration test projesi (final teslimde bilinçli olarak eklenmedi)
- [x] Swagger API dokümantasyonu (`/swagger`)
- [x] Logging (Serilog — console + `logs/`)
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Email servisi
- [ ] SMS bildirimleri
- [ ] Multi-currency desteği
- [ ] Mobile app (React Native)

---
