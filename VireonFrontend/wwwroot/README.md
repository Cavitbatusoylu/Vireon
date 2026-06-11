## Vireon Frontend

Bu klasör statik (HTML/CSS/JS) bir arayüz içerir.

### Çalıştırma (Windows)

PowerShell ile:

```powershell
cd .\frontend
python -m http.server 5173
```

Sonra tarayıcıdan `http://localhost:5173/` adresini açın.

### Logo / Asset

- Tüm görseller `frontend/images/` altında.
- Logo arka planını kaldırmak / alternatif dosyaları üretmek için:

```powershell
cd .\frontend\tools
python .\make_logos_transparent.py
```

