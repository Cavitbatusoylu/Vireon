# Seed Data Kontrol

## Gerçek Seed Verileri (VireonContext.cs)

### Users
| Id | Name | Surname | Email | Password |
|----|------|---------|-------|----------|
| 1 | Cavit Batu | Soylu | cavitbatu@vireon.com | 123456 |
| 2 | Enes | Kaya | enes@vireon.com | 123456 |
| 3 | Kerem | Arslan | kerem@vireon.com | 123456 |

### Accounts
| Id | UserId | AccountNumber | Balance | Currency |
|----|--------|---------------|---------|----------|
| 1 | 1 | VR-1001 | 15000.00 | TRY |
| 2 | 2 | VR-1002 | 8500.00 | TRY |
| 3 | 3 | VR-1003 | 3200.00 | TRY |

### DailyLimits
| Id | UserId | MaxDailyLimit | UsedLimit | LastResetDate |
|----|--------|---------------|-----------|---------------|
| 1 | 1 | 50000.00 | 1500.00 | 2026-04-04 |
| 2 | 2 | 25000.00 | 0.00 | 2026-04-04 |
| 3 | 3 | 10000.00 | 500.00 | 2026-04-04 |

### Transactions
| Id | SenderAccountId | ReceiverAccountId | Amount | Date |
|----|-----------------|-------------------|--------|------|
| 1 | 1 (VR-1001) | 2 (VR-1002) | 1000.00 | 2026-04-01 |
| 2 | 2 (VR-1002) | 3 (VR-1003) | 500.00 | 2026-04-02 |
| 3 | 1 (VR-1001) | 3 (VR-1003) | 250.00 | 2026-04-03 |

### LedgerEntries
| Id | AccountId | Amount | PreviousBalance | NewBalance | Description |
|----|-----------|--------|-----------------|------------|-------------|
| 1 | 1 | -1000.00 | 16000.00 | 15000.00 | VR-1002 hesabına havale |
| 2 | 2 | +1000.00 | 7500.00 | 8500.00 | VR-1001 hesabından havale |
| 3 | 2 | -500.00 | 8500.00 | 8000.00 | VR-1003 hesabına havale |
| 4 | 3 | +500.00 | 2700.00 | 3200.00 | VR-1002 hesabından havale |

### FraudLogs
| Id | AccountId | RiskType | Description | LogDate |
|----|-----------|----------|-------------|---------|
| 1 | 1 | Low | Normal işlem | 2026-04-01 |
| 2 | 2 | Medium | Yüksek tutarlı işlem tespit edildi | 2026-04-02 |

---

## SQL Kontrol Sorguları

```sql
-- Kayıt sayıları
SELECT COUNT(*) FROM Users;        -- Beklenen: 3
SELECT COUNT(*) FROM Accounts;     -- Beklenen: 3
SELECT COUNT(*) FROM DailyLimits;  -- Beklenen: 3
SELECT COUNT(*) FROM Transactions; -- Beklenen: 3
SELECT COUNT(*) FROM LedgerEntries;-- Beklenen: 4
SELECT COUNT(*) FROM FraudLogs;    -- Beklenen: 2

-- Kullanıcı-Hesap-Limit birleşik kontrol
SELECT u.Name, u.Email, a.AccountNumber, a.Balance, dl.MaxDailyLimit, dl.UsedLimit
FROM Users u
JOIN Accounts a ON u.Id = a.UserId
JOIN DailyLimits dl ON u.Id = dl.UserId;

-- Ledger tutarlılık kontrolü (PreviousBalance + Amount = NewBalance)
SELECT Id, AccountId, PreviousBalance, Amount, NewBalance,
       (PreviousBalance + Amount) AS Calculated,
       CASE WHEN (PreviousBalance + Amount) = NewBalance THEN 'OK' ELSE 'HATA' END AS Check
FROM LedgerEntries;

-- Duplicate email kontrolü
SELECT Email, COUNT(*) FROM Users GROUP BY Email HAVING COUNT(*) > 1;
-- Beklenen: boş

-- Duplicate hesap no kontrolü
SELECT AccountNumber, COUNT(*) FROM Accounts GROUP BY AccountNumber HAVING COUNT(*) > 1;
-- Beklenen: boş
```

---

## Migration Komutları (Backend kapalıyken çalıştır)

```bash
# Seed data düzeltmesi için migration
dotnet ef migrations add FixLedgerSeedData --project Vireon.DataAccessLayer --startup-project Vireon.PresentationLayer

# Database'e uygula
dotnet ef database update --project Vireon.DataAccessLayer --startup-project Vireon.PresentationLayer
```
