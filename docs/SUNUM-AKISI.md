# Vireon — Sunum Akışı (5–7 dk)

## 1. Giriş (30 sn)
- Proje adı: **Vireon — Dijital Banka Çekirdek Sistemi**
- Teknoloji: ASP.NET Core MVC + katmanlı mimari + SQLite
- Ana menüyü göster (`/`)

## 2. Mimari (1 dk)
- `/Home/Architecture` sayfasını aç
- Katman tablosunu anlat: Entity → DataAccess → Business → DTO → Presentation
- `_Layout.cshtml` ve ayrı sayfa yapısını vurgula

## 3. Giriş ve Dashboard (1,5 dk)
- `/Account/Login` — demo hesap ile giriş
- `/Dashboard/Overview` — bakiye, son işlemler, grafik

## 4. Para Transferi + Ledger (1,5 dk)
- `/Dashboard/Transfer` — VR-88888'e transfer
- Başarılı işlem sonrası `/Dashboard/History`
- Kısaca: ACID, `LedgerEntries`, fraud log

## 5. Limit ve Admin (1 dk)
- `/Dashboard/Limits` — günlük limit kullanımı
- Admin hesabı ile `/Dashboard/Admin` (isteğe bağlı)

## 6. API ve Kapanış (30 sn)
- Swagger: `/swagger`
- Özet: ayrı sayfalar, ViewModel, çalışan backend, rapor + ekran görüntüleri

---

**Sonda söylenecek cümle:**  
*"Tek HTML dosyası yerine MVC Layout ve ViewModel kullandık; her modül ayrı URL'de. Backend katmanları API üzerinden bağlanıyor; raporda mimari diyagram ve ekran görüntüleri mevcut."*
