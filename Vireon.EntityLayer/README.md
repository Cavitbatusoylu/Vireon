# Vireon.EntityLayer — Veritabanı Entity Modelleri

Bu katman **EF Core entity sınıflarını** içerir. Hocanın sorduğu "modeller" buradadır.

## Dosya konumu

```
Vireon.EntityLayer/Concrete/
├── User.cs           — Kullanıcı (rol, e-posta, şifre)
├── Account.cs        — Banka hesabı (bakiye, para birimi, RowVersion)
├── Transaction.cs    — Para transferi kaydı
├── LedgerEntry.cs    — Değişmez muhasebe defteri satırı
├── DailyLimit.cs     — Günlük işlem limiti
├── FraudLogs.cs      — Dolandırıcılık log kaydı
└── TransactionStatus.cs — İşlem durumu enum
```

## İlişkiler

- `User` 1—N `Account`
- `Account` 1—N `Transaction` (gönderen / alıcı)
- `Account` 1—N `LedgerEntry`, `FraudLog`

Migration dosyaları: `Vireon.DataAccessLayer/Migrations/`
