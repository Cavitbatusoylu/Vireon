# Vireon — Araçlar ve dokümantasyon

Uygulama kodu dışındaki yardımcı dosyalar bu klasörde toplanır.

| Alt klasör | İçerik |
|------------|--------|
| `scripts/` | `align-database.ps1`, `sync-database.ps1`, PWA/Electron ikon scriptleri |
| `docs/` | Proje raporu, sunum akışı, ekran görüntüleri |
| `desktop/` | Electron `main.js` |
| `electron/` | Masaüstü uygulama ikonları (`.ico`, `.png`) |
| `docker/` | `Dockerfile` — `docker build -f tools/docker/Dockerfile .` |
| `logs/` | Serilog çıktıları (`.log` dosyaları git'e girmez) |

## Kısayollar (repo kökünden)

```powershell
.\tools\scripts\align-database.ps1   # DB şema eşitleme
npm run sync-db                       # Paylaşımlı DB'yi Git'e push
npm run icons                         # PWA + Electron ikonları
npm start                             # Electron masaüstü (localhost:5202 gerekir)
```
