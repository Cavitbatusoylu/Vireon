<br/>
<div align="center">
<a href="https://github.com/Cavitbatusoylu/Vireon">
<img src="Vireon.PresentationLayer/wwwroot/images/vireon-logo-transparent-new.png" alt="Logo" width="180" height="auto">
</a>
<h3 align="center">Vireon - Immutable Ledger</h3>
  <p align="center">
    <strong>Dijital Banka Çekirdek Sistemi Simülasyonu</strong>
    <br/>
    <em>Database-Centric Digital Bank Core System</em>
    <br/>
    <br/>
    <a href="https://github.com/Cavitbatusoylu/Vireon"><strong>Belgeleri İncele »</strong></a>
    <br/>
    <br/>
    <a href="https://caps-hewlett-sara-kinase.trycloudflare.com">🌐 Canlı Demo</a>
    ·
    <a href="https://github.com/Cavitbatusoylu/Vireon/issues">Hata Bildir</a>
    ·
    <a href="https://github.com/Cavitbatusoylu/Vireon/issues">Özellik İste</a>
  </p>
</div>

<br/>

## 🌟 Proje Hakkında

**Vireon**, finansal işlemlerin güvenli, tutarlı ve izlenebilir biçimde yönetilmesini sağlayan, veritabanı merkezli bir dijital banka çekirdek sistemi simülasyonudur. Proje; para transferi, hesap yönetimi, günlük limit kontrolü, fraud analizi ve immutable muhasebe defteri mantığını uygulayarak gerçek bankacılık sistemlerinin çekirdek işlem mekanizmasını teknik olarak modellemektedir.

### 🎯 Temel Özellikler

- ✅ **ACID Transaction**: Tüm finansal işlemler atomik, tutarlı, izole ve kalıcı
- ✅ **Immutable Ledger**: Değişmez muhasebe defteri - kayıtlar silinemez
- ✅ **Fraud Detection**: Gerçek zamanlı kural tabanlı risk analizi
- ✅ **Daily Limits**: Günlük işlem limiti kontrolü
- ✅ **Modern UI/UX**: Responsive, PWA destekli web arayüzü
- ✅ **AI Integration**: Neon AI Coach (Kumru AI)
- ✅ **Real-time Charts**: Canlı bakiye ve işlem grafikleri
- ✅ **QR Payment**: QR kod ile ödeme sistemi

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 🚀 Teknolojiler ve Altyapı

Vireon'un kalbinde, sektör standartlarında performans sunan güçlü teknolojiler yatıyor:

### Backend
* **Framework:** ASP.NET Core 8.0 Web API
* **Language:** C# 12
* **ORM:** Entity Framework Core 8.0
* **Database:** MySQL 8.0
* **Architecture:** Layered Architecture (N-Tier)
* **Validation:** FluentValidation
* **Mapping:** AutoMapper

### Frontend
* **UI:** Modern HTML5, CSS3, JavaScript (ES6+)
* **Charts:** Chart.js
* **PWA:** Service Worker, Manifest
* **Responsive:** Mobile-first design
* **Icons:** Emoji-based icon system
* **Notifications:** Custom toast system

### Infrastructure
* **Deployment:** Cloudflare Tunnel
* **Version Control:** Git & GitHub
* **IDE:** Visual Studio 2022
* **Package Manager:** NuGet

### Key Features
* **ACID Transactions:** Database-level transaction management
* **Immutable Ledger:** Append-only financial records
* **Fraud Detection:** Rule-based risk analysis
* **AI Integration:** Kumru AI (Hugging Face)
* **Real-time Updates:** Live balance and transaction tracking

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
├── Vireon.DataAccessLayer/       # 🗄️ Data Access Layer (Repository Pattern)
│   ├── Concrete/
│   │   └── Context.cs            # DbContext (EF Core)
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
│       └── KumruAIService.cs      # AI entegrasyonu
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
└── Vireon.slnx                   # Solution file
```

### 🏗️ Mimari Katmanlar

#### 1. Presentation Layer (Sunum Katmanı)
- ASP.NET Core Web API
- Modern web UI (HTML/CSS/JS)
- RESTful API endpoints
- PWA desteği

#### 2. Business Layer (İş Mantığı Katmanı)
- Transaction Manager (ACID)
- Fraud Detection Service
- AI Integration Service
- Business rules ve validations

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
- MySQL 8.0+
- Visual Studio 2022 veya VS Code
- Git

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/Cavitbatusoylu/Vireon.git
cd Vireon
```

### 2. Database Bağlantısını Yapılandırın
`Vireon.PresentationLayer/appsettings.json` dosyasını düzenleyin:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=VireonDB;User=root;Password=yourpassword;"
  }
}
```

### 3. Database Migration
```bash
cd Vireon.DataAccessLayer
dotnet ef database update
```

### 4. Projeyi Çalıştırın
```bash
cd Vireon.PresentationLayer
dotnet run
```

Tarayıcınızda `https://localhost:5202` adresini açın.

### 5. Test Kullanıcıları
```
Email: admin@vireon.com
Password: admin123

Email: ahmet@test.com
Password: test123

Email: ayse@test.com
Password: test123
```

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
- Neon AI Coach (Kumru AI)
- Hugging Face entegrasyonu
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
**Rol:** Full Stack Developer  
**Sorumluluklar:**
- Frontend (WPF masaüstü uygulaması)
- Modern web UI (HTML/CSS/JS)
- TransferService (ACID/Rollback/Concurrency)
- Database connection konfigürasyonu
- PWA implementasyonu
- Cloudflare Tunnel deployment

### Enes Kaya
**Rol:** Backend Developer  
**Sorumluluklar:**
- AccountService
- FraudService
- LedgerService
- Tüm API Controller'lar
- Backend servis katmanı
- Business logic implementation

### Kerem Arslan
**Rol:** Database Specialist  
**Sorumluluklar:**
- Entity modellerin yazılması
- DbContext tanımı
- DailyLimit servisi
- Seed data hazırlama
- Database migrations
- Schema design

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
- **Backend Servisler:** 8
- **API Endpoints:** 25+
- **Database Tabloları:** 6
- **Frontend Sayfaları:** 10+
- **Test Kullanıcıları:** 3
- **Deployment:** Cloudflare Tunnel

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
Canlı Demo: [https://caps-hewlett-sara-kinase.trycloudflare.com](https://caps-hewlett-sara-kinase.trycloudflare.com)

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

### Cloudflare Tunnel
Proje Cloudflare Tunnel ile deploy edilmiştir:

```bash
cloudflared tunnel --url http://localhost:5202
```

**Canlı URL:** https://caps-hewlett-sara-kinase.trycloudflare.com

### Production Checklist
- [x] Database migration tamamlandı
- [x] Seed data yüklendi
- [x] API testleri yapıldı
- [x] Frontend testleri yapıldı
- [x] Cloudflare tunnel aktif
- [x] HTTPS aktif
- [ ] SSL sertifikası (production için)
- [ ] Domain bağlantısı (opsiyonel)

---

## 🧪 Test Komutları

```bash
# Proje derleme
dotnet build

# Testleri çalıştır
dotnet test

# Migration oluştur
dotnet ef migrations add MigrationName

# Database güncelle
dotnet ef database update

# Projeyi çalıştır
dotnet run --project Vireon.PresentationLayer
```

---

## 📚 Ek Kaynaklar

- [ASP.NET Core Docs](https://docs.microsoft.com/aspnet/core)
- [Entity Framework Core](https://docs.microsoft.com/ef/core)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [PWA Guide](https://web.dev/progressive-web-apps/)

---

## 🎯 Gelecek Planları

- [ ] Unit testler
- [ ] Integration testler
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Swagger API dokümantasyonu
- [ ] Logging sistemi (Serilog)
- [ ] Email servisi
- [ ] SMS bildirimleri
- [ ] Multi-currency desteği
- [ ] Mobile app (React Native)

---
