# Vireon — Veritabanı Dokümantasyonu

**Sorumlu:** Kerem Arslan (Entity, DbContext, migration, seed)  
**Motor:** SQLite 3 (gömülü, sunucu kurulumu gerekmez)  
**Dosya:** `Database/vireon_local.db` (repoda paylaşımlı)

---

## 1. Genel Bakış

| Özellik | Değer |
|--------|--------|
| ORM | Entity Framework Core 8 |
| DbContext | `Vireon.DataAccessLayer/Concrete/EntityFramework/VireonContext.cs` |
| Migration klasörü | `Vireon.DataAccessLayer/Migrations/` |
| Bağlantı | `appsettings.json` → `Data Source=../Database/vireon_local.db` |
| Çözümleme | `Program.cs` → `ResolveSharedDbPath()` (bin/Debug’ten çalışınca da doğru DB bulunur) |

Uygulama açılışında:

1. `context.Database.Migrate()` — bekleyen migration’lar uygulanır  
2. Seed — `cavit@vireon.com` yoksa tablolar temizlenir ve demo kullanıcılar eklenir (`Program.cs`)

---

## 2. Tablolar ve İlişkiler

```
Users 1──N Accounts
Users 1──1 DailyLimits
Accounts 1──N Transactions (SenderAccountId / ReceiverAccountId)
Accounts 1──N LedgerEntries
Accounts 1──N FraudLogs
```

| Tablo | Açıklama |
|-------|----------|
| **Users** | Kullanıcı, e-posta, BCrypt şifre, rol (Admin/User), VR-XXXXX hesap no |
| **Accounts** | Bakiye, para birimi, UserId |
| **Transactions** | Tutar, gönderici/alıcı hesap, durum, açıklama, tarih |
| **LedgerEntries** | Immutable defter satırı (önceki/yeni bakiye) |
| **DailyLimits** | Günlük max limit ve kullanılan tutar |
| **FraudLogs** | Şüpheli işlem kayıtları (risk tipi, açıklama) |

---

## 3. Migration Geçmişi

| Migration | Dosya | İçerik |
|-----------|--------|--------|
| `InitialCreate` | `20260419122318_InitialCreate.cs` | Tüm temel tablolar |
| `AddRowVersion` | `20260510085037_AddRowVersion.cs` | Eşzamanlılık için RowVersion |
| `AddUserRole` | `20260510095002_AddUserRole.cs` | Kullanıcı `Role` alanı |

Yeni migration ekleme (geliştirici makinesinde):

```bash
cd Vireon.PresentationLayer
dotnet ef migrations add MigrationAdi --project ../Vireon.DataAccessLayer
dotnet ef database update --project ../Vireon.DataAccessLayer
```

> EF Core tools yüklü değilse: `dotnet tool install --global dotnet-ef`

---

## 4. Seed Data

**Konum:** `Vireon.PresentationLayer/Program.cs` (ilk kurulum bloğu)

**Koşul:** Veritabanında `cavit@vireon.com` yoksa çalışır.

**Eklenen kullanıcılar:**

| E-posta | Şifre | Hesap | Rol | Başlangıç bakiye |
|---------|-------|-------|-----|------------------|
| cavit@vireon.com | admin123 | VR-99999 | Admin | 1.000.000 TRY |
| enes@vireon.com | enes123 | VR-88888 | User | 50.000 TRY |

Ayrıca her kullanıcı için `DailyLimit` (100.000 TRY) ve ilk `LedgerEntry` oluşturulur.

**Not:** Repodaki `Database/vireon_local.db` bu seed + sonraki işlemleri içerir. Sıfırdan başlamak için dosyayı silip uygulamayı yeniden çalıştırın.

---

## 5. Git ve Yerel Dosyalar

| Dosya | Git |
|-------|-----|
| `Database/vireon_local.db` | ✅ Takip edilir (ekip paylaşımı) |
| `*.db-shm`, `*.db-wal` | ❌ `.gitignore` (çalışma anı) |

### Ekip senkronu (önemli)

SQLite **sunucu değildir**; her PC kendi dosya kopyasını okur. Başka bilgisayarda açılan hesap, **o PC'den DB push edilmeden** senin makinede görünmez.

```powershell
# Veri değişince (API kapalıyken)
powershell -File scripts/sync-database.ps1

# Diğer PC
git pull origin Cavit-login
```

Uygulama açılışında log: `📂 Paylaşımlı SQLite: ...\Database\vireon_local.db`

---

## 6. Kerem — Kontrol Listesi

- [ ] Migration’lar güncel (`VireonContextModelSnapshot.cs` ile uyumlu)
- [ ] Yeni alan eklendiğinde migration + kısa not
- [ ] Seed şifreleri `DEMO.md` ile uyumlu
- [ ] DB Explorer / Admin panel sayıları ile tablo kayıt sayıları tutarlı
