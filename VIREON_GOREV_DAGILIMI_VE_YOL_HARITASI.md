# 🏦 VIREON – Dijital Banka Çekirdek Sistemi Simülasyonu Mimarisi

*Projenin güncel durumu, teknik rapor metni ve projedeki **gerçek kod mimarisi (Electron, SQLite vb.)** incelenerek, kişi bazlı olmadan fazlara ayrılmıştır.*

---

## 🚀 Proje Fazları ve Geliştirme Durumu

### ✅ FAZ 1 - Çekirdek Altyapı: Veritabanı ve API Kurulumu [TAMAMLANDI] 🟡 Zorluk: Medium
*(Kod dizinindeki gerçek yapı baz alınmıştır)*
- Tam lokalite prensibiyle kod dizininde otonom çalışması için **SQLite (`vireon_local.db`)** altyapısının `appsettings.json` ile entegre edilmesi.
- Sunum (Jüri) senaryosu ve alternatif testler için **XAMPP/MySQL (`mysql_vireon_db.sql`)** mimarisinin de eklenmesiyle projeye çift veritabanı (Dual DB) esnekliğinin kazandırılması.
- Veritabanı kalıntıları temizlenerek, migration yönetimi ile DB yapısının (Seed Datası olmadan) temiz bir şekilde oluşturulması.
- Entity modellerinin "Code First" ile tanımlanması.
- ASP.NET Core ve C# ile Web API mimarisinin ayağa kaldırılması ve HTTP isteklerini karşılayan Controller yapılarının oluşturulması.

### ✅ FAZ 2 - Temel Finansal Mantık ve Transaction [TAMAMLANDI] 🔴 Zorluk: High
*(Bölüm 5, 6)*
- Temel para transferi kurgusunun (Bakiye kontrolü vb.) oluşturulması.
- İşlemlerin bölünemezliğini sağlayan Transaction yapıları.
- ACID prensiplerinin entegrasyonu ve herhangi bir hata anında çalışan "Rollback" (geri alma) mekanizmasının koda dökülmesi.

### 🔄 FAZ 3 - İleri Seviye İş Kuralları: Fraud, Limit ve Concurrency [DEVAM EDİYOR] 🔴 Zorluk: High
*(Bölüm 7, 8, 9, 10)*
- Kullanıcıların DailyLimits üzerinden günlük limit kontrollerinin çalıştırılması.
- Kural tabanlı risk analizi yapılması ve şüpheli işlemlerin (FraudLogs) yakalanması.
- "Optimistic Concurrency (Row Version)" sistemiyle eş zamanlı isteklerde çakışmaların engellenmesi.
- *Durum: Temel yapı kuruldu ancak ileri düzey iş kurallarının (Fraud kuralları ve çakışma durumları) uçtan uca ince ayarları devam ediyor.*

### 🔄 FAZ 4 - Masaüstü (Electron.js) Arayüz Entegrasyonu [DEVAM EDİYOR] 🟡 Zorluk: Medium
*(Gerçek kod altyapısı kontrol edilerek düzenlenmiştir)*
- Raporlama aşamasındaki "WPF" hedefi geride bırakılıp, doğrudan projedeki `main.js` ve `package.json` üzerinden **Electron.js** tabanlı daha modern ve cross-platform bir masaüstü uygulamasının inşa edilmesi.
- `localhost:5202` üzerinden ASP.NET Core'a doğrudan arayüz wrapper'ı sağlanarak, tamamen izole pencereli bağımsız bir bankacılık masaüstü uygulamasının çalıştırılması.

### 🔄 FAZ 5 - Sistem Bütünlük Doğrulaması ve Canlı Testler [DEVAM EDİYOR] 🟢 Zorluk: Low
*(Bölüm 4.2)*
- Sisteme başlangıç (Seed) test verilerinin akıtılması ve uçtan uca denenmesi.
- Tüm transfer şartlarının, otomatik backend kontrollerinin API üzerinden gönderilen sanal yüklerle (stress-test) test edilmesi.

### ⏳ FAZ 6 - Dışarıya Açılma ve Cloudflare Tunnel Dağıtımı [BAŞLAMADI] 🔴 Zorluk: High
- Veritabanının bulut sunucularına aktarılmayıp; sistemin tam lokalite prensibiyle doğrudan proje dizinindeki yerel `.db` kullanılarak ayağa kaldırılması.
- Yalnızca ASP.NET Core API yapısının, Cloudflare Tunnel vb. yapılandırmalar ile güvenli bir şekilde internete açılması.
- *Durum: Sistem yerel veritabanı ile çalışmaya devam edecek, dış bağlantılar tünel ile içeri alınacaktır.*
