# Vireon — Demo ve Sunum Rehberi

Bu dosya final sunumu ve canlı demo için standart akışı tanımlar.

---

## Canlı Demo Adresleri

| Ortam | URL | Not |
|-------|-----|-----|
| **Yerel (birincil)** | http://localhost:5202 | `dotnet run` sonrası — sunumda en güvenilir |
| Swagger | http://localhost:5202/swagger | API test |
| **Cloudflare Tunnel** | README’deki link (varsa) | Tunnel açıkken; kapalıysa çalışmaz |

Sunum öncesi mutlaka yerel demo test edin:

```bash
cd Vireon.PresentationLayer
dotnet run
# Tarayıcı: http://localhost:5202
```

---

## Demo Hesapları

| Rol | E-posta | Şifre | Hesap no |
|-----|---------|-------|----------|
| Admin | cavit@vireon.com | admin123 | VR-99999 |
| Kullanıcı | enes@vireon.com | enes123 | VR-88888 |

---

## Sunum Senaryosu (~10–12 dk)

### 1. Giriş (1 dk)
- Landing: mimari, teknoloji (SQLite, ASP.NET Core, PWA)
- Giriş → **cavit@vireon.com** / admin123

### 2. Kullanıcı paneli (3 dk)
- Dashboard: bakiye, son işlemler
- **Para yatır** — küçük tutar
- **Para gönder** — Enes hesabına (VR-88888), alıcı adı önizlemesi
- **İşlem geçmişi** — karşı taraf ve tutar kutuları
- TR/EN dil + açık/koyu tema

### 3. Admin (3 dk)
- Sidebar → **Admin Paneli**
- İstatistik kartları (kullanıcı, işlem, fraud)
- **Tüm kullanıcılar** / **Tüm işlem kayıtları**
- **Şüpheli işlemler** — gece yüksek tutar veya sık işlem tetiklemek için kısa anlatım

### 4. Teknik (2 dk)
- **DB Explorer** — paylaşımlı `Database/vireon_local.db`
- Kısa: ACID transfer, immutable ledger, fraud log (engellemeden kayıt)

### 5. AI (1 dk)
- Neon AI — TR ve EN örnek soru (“Bakiyem ne kadar?” / “How do I transfer?”)

### 6. Kapanış (1 dk)
- Ekip görev dağılımı (README)
- GitHub: `Cavit-login` branch
- Sorular

---

## Opsiyonel: Electron

Masaüstü kabuk uygulaması (zorunlu değil):

```bash
# Önce API çalışıyor olmalı (localhost:5202)
npm install
npm start
```

`main.js` aynı URL’yi açar.

---

## Ekip — veritabanı senkronu

Başka PC'de demo / kayıt yaptıysanız sunum öncesi:

```powershell
git pull origin Cavit-login   # güncel vireon_local.db
```

Yeni kullanıcı veya işlem ekledikten sonra:

```powershell
powershell -File scripts/sync-database.ps1
```

## Sorun Giderme (sunum anı)

| Sorun | Çözüm |
|-------|--------|
| Port meşgul | Eski `Vireon.PresentationLayer.exe` kapat |
| Boş DB | `Database/vireon_local.db` sil → `dotnet run` |
| Eski arayüz | Ctrl+F5 (cache) |
| Giriş olmuyor | Seed hesaplarını kullan (yukarıdaki tablo) |

---

## Ekip — Sunumda kim ne anlatır?

| Kişi | Konu |
|------|------|
| **Cavit** | UI/UX, PWA, DB yolu, demo akışı, GitHub |
| **Enes** | API, TransactionManager, fraud kuralları, controller’lar |
| **Kerem** | Şema, migration, seed, SQLite / EF Core |
