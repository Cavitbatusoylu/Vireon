# Gelecek Görevler & Notlar (Vireon Projesi)

Bu dosya, projeyi buluta taşırken eksik kalan veya daha sonra ilgilenilecek olan "Veritabanı Entegrasyonu" ve "Frontend Yayını" adımları için bir not defteri niteliğindedir.

## Bekleyen İşlemler

### 1. Bulut Veritabanı (Cloud Database) Kurulumu
- **Sorun:** Proje şu an Google Cloud Run'da (vireon-api) çalışıyor ancak `appsettings.json` içindeki bağlantı adresi hala `localhost/VireonDB`. Bu nedenle API, veritabanına bağlanamıyor.
- **Çözüm Planı:**
  - Tamamen ücretsiz ve güçlü bir PostgreSQL servisi açılacak: **Supabase** veya **Neon.tech**.
  - Supabase üzerinden yeni proje ve veritabanı kurulacak.
  - Supabase'den alınan "Connection String" (Bağlantı Linki), projedeki `appsettings.json` ve `appsettings.Development.json` dosyalarına eklenecek.
  - Entity Framework veritabanı tabloları, `dotnet ef database update` komutuyla Supabase üzerine aktarılacak (Migration işlemleri).

### 2. Frontend (Kullanıcı Arayüzü) Yayını
- **Sorun:** VireonFrontend projesi hala kullanıcının bilgisayarında (local).
- **Çözüm Planı:**
  - Frontend kısmı **Vercel** veya **Netlify** kullanılarak GitHub üzerinden otomatik yayına alınacak.
  - Frontend kodlarındaki (örn: fetch) API URL adresleri, Google Cloud üzerinden aldığımız canlı link ile ( `https://vireon-api-1070043978842.europe-west1.run.app` ) değiştirilecek.

### 3. CI/CD Pipeline (İsteğe Bağlı)
- **Sorun:** Projede bir değişiklik yapıldığında Google Cloud'a (Backend) elle `gcloud run deploy` komutu gönderilmesi gerekiyor.
- **Çözüm Planı:** GitHub Actions kurgulanarak, `main` dalına push yapıldığında Cloud Run'ın otomatik olarak yeni kodları derlemesi sağlanabilir.
