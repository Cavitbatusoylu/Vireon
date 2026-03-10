<br/>
<div align="center">
<a href="https://github.com/Cavitbatusoylu/Vireon">
<img src="VireonFrontend/wwwroot/images/vireon-logo-transparent-new.png" alt="Logo" width="180" height="auto">
</a>
<h3 align="center">Vireon Projesi</h3>
  <p align="center">
    <strong>Geleceğin Teknolojileriyle Şekillenen Yenilikçi Çözüm Platformu</strong>
    <br/>
    <br/>
    <a href="https://github.com/Cavitbatusoylu/Vireon"><strong>Belgeleri İncele »</strong></a>
    <br/>
    <br/>
    <a href="https://github.com/Cavitbatusoylu/Vireon/issues">Hata Bildir</a>
    ·
    <a href="https://github.com/Cavitbatusoylu/Vireon/issues">Özellik İste</a>
  </p>
</div>

<br/>

## 🌟 Proje Hakkında

**Vireon**, modern yapıları ve ölçeklenebilir altyapısıyla ekiplerin hızlıca yenilikçi projeler üretmesi için tasarlanmış kapsamlı bir tam yığın (full-stack) mimarisidir. Proje; performanslı bir Backend API'ı ile, modern ve etkileşimli kullanıcı deneyimi sunan Frontend yapısını tek bir potada mükemmel bir uyum ile eritir.

Takım çalışmasını ve sürekli gelişimi merkeze alan Vireon, özel sektör ve yarışmalar (örn. TEKNOFEST) hedeflenerek tasarlanmış, baştan sona profesyonel kalitede bir başlangıç sistemidir.

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 🚀 Teknolojiler ve Altyapı

Vireon'un kalbinde, sektör standartlarında performans sunan güçlü teknolojiler yatıyor:

* **Backend Api:** Güçlü C# / .NET Mimarisi (`VireonAPI`)
* **Frontend UI:** Modern ve Çevik Web Mimarisi (`VireonFrontend`)
* **Veritabanı Entegrasyonu:** Entity Framework Core
* **Esnek Proje Yapısı:** Ekip içi hızlı adaptasyon ve limitsiz erişim prensipleri için tasarlanmış `.slnx` yapısı.

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 📂 Proje Yapısı ve Mimari

Kod tabanı, sorumlulukları net şekilde ayıran anlaşılır bir düzene sahiptir:

```plaintext
Vireon/
├── VireonAPI/              # Projenin beyni (Backend API, Modeller, Migrationlar)
│   ├── Controllers/        # API Uç noktaları
│   ├── Data/               # Veritabanı Context ve Mimari Bağlantıları
│   └── Models/             # Veri Modelleri (User, Account, Question vb.)
│
├── VireonFrontend/         # Projenin modern yüzü (Kullanıcı Arayüzü)
│   ├── wwwroot/            # CSS, JS, Medya ve HTML dosyaları
│   └── Controllers/        # Frontend İletişim Noktaları
│
└── Vireon.slnx             # Tüm projeyi birbirine bağlayan merkez köprü
```

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 🛠️ Ekip İçin Başlangıç & Kurulum

Bu depo (repository) özel (private) bir alandır ve tüm ekip üyelerinin takıldıkları yerlerde birbirlerinin dosyalarını özgürce görebilmeleri için kısıtlamalar (`.gitignore` filtreleri) kaldırılmıştır.  

Projeyi yerel bilgisayarınızda (local) ayağa kaldırmak için şu adımları izleyin:

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/Cavitbatusoylu/Vireon.git
```

### 2. Gerekli Bağımlılıkları Yükleyin ve Çalıştırın
Proje kök dizinindeyken arka ucu (API) ve ön yüzü (Frontend) kendi IDE'nizle (Visual Studio / VS Code) çalıştırarak otomatik olarak ilgili servisleri ayağa kaldırabilirsiniz. 

```bash
# Backend için
cd VireonAPI
dotnet run

# Frontend için ayrı bir terminalde
cd VireonFrontend
dotnet run
```
*(Proje `appsettings.json` dosyaları ve gerekli port yapılandırmalarıyla hazır olarak gelmektedir.)*

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

## 🤝 Katkıda Bulunma & Ekip Çalışması
Vireon, birlikte geliştirilmek için yaratılmış dinamik bir kod tabanıdır. Tüm ekip arkadaşları doğrudan **main** dalına veya kendi dallarına gönderim yapabilirler.
Daha iyi bir kod tabanı için pull request'ler ve review (inceleme) süreçlerine önem veriyoruz.

**Ekip İçi Hızlı Commit Örneği:**
```bash
git add .
git commit -m "feat(api): yeni kullanıcı doğrulaması eklendi"
git push origin main
```

<p align="right">(<a href="#readme-top">yukarı dön</a>)</p>

---
<div align="center">
  <b>Vireon Takımı Tarafından Tutkuyla Geliştirildi ❤️</b>
</div>
