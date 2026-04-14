-- ============================================================
-- Vireon Digital Bank - SQL Server Database Script
-- Versiyon: 1.0 | Tarih: 14 Nisan 2026
-- Kullanim: SQL Server Management Studio veya sqlcmd ile calistirin
-- ============================================================

USE master;
GO

-- Veritabani yoksa olustur
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'VireonDB')
BEGIN
    CREATE DATABASE VireonDB;
END
GO

USE VireonDB;
GO

-- ============================================================
-- TABLOLARI TEMIZLE (varsa)
-- ============================================================
IF OBJECT_ID('dbo.LedgerEntries', 'U') IS NOT NULL DROP TABLE dbo.LedgerEntries;
IF OBJECT_ID('dbo.FraudLogs',     'U') IS NOT NULL DROP TABLE dbo.FraudLogs;
IF OBJECT_ID('dbo.Transactions',  'U') IS NOT NULL DROP TABLE dbo.Transactions;
IF OBJECT_ID('dbo.DailyLimits',   'U') IS NOT NULL DROP TABLE dbo.DailyLimits;
IF OBJECT_ID('dbo.Accounts',      'U') IS NOT NULL DROP TABLE dbo.Accounts;
IF OBJECT_ID('dbo.Users',         'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.__EFMigrationsHistory', 'U') IS NOT NULL DROP TABLE dbo.__EFMigrationsHistory;
GO

-- ============================================================
-- TABLO: Users
-- ============================================================
CREATE TABLE dbo.Users (
    Id       INT            IDENTITY(1,1) NOT NULL,
    Name     NVARCHAR(MAX)  NOT NULL,
    Surname  NVARCHAR(MAX)  NOT NULL,
    Email    NVARCHAR(MAX)  NOT NULL,
    Password NVARCHAR(MAX)  NOT NULL,
    CONSTRAINT PK_Users PRIMARY KEY (Id)
);
GO

-- ============================================================
-- TABLO: Accounts
-- ============================================================
CREATE TABLE dbo.Accounts (
    Id            INT             IDENTITY(1,1) NOT NULL,
    UserId        INT             NOT NULL,
    AccountNumber NVARCHAR(MAX)   NOT NULL,
    Balance       DECIMAL(18,2)   NOT NULL,
    Currency      NVARCHAR(MAX)   NOT NULL,
    CONSTRAINT PK_Accounts PRIMARY KEY (Id),
    CONSTRAINT FK_Accounts_Users_UserId FOREIGN KEY (UserId)
        REFERENCES dbo.Users (Id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_Accounts_UserId ON dbo.Accounts (UserId);
GO

-- ============================================================
-- TABLO: DailyLimits
-- ============================================================
CREATE TABLE dbo.DailyLimits (
    Id             INT           IDENTITY(1,1) NOT NULL,
    UserId         INT           NOT NULL,
    MaxDailyLimit  DECIMAL(18,2) NOT NULL,
    UsedLimit      DECIMAL(18,2) NOT NULL,
    LastResetDate  DATETIME2     NOT NULL,
    CONSTRAINT PK_DailyLimits PRIMARY KEY (Id),
    CONSTRAINT FK_DailyLimits_Users_UserId FOREIGN KEY (UserId)
        REFERENCES dbo.Users (Id) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX IX_DailyLimits_UserId ON dbo.DailyLimits (UserId);
GO

-- ============================================================
-- TABLO: Transactions
-- ============================================================
CREATE TABLE dbo.Transactions (
    Id               INT           IDENTITY(1,1) NOT NULL,
    SenderAccountId  INT           NOT NULL,
    ReceiverAccountId INT          NOT NULL,
    Amount           DECIMAL(18,2) NOT NULL,
    Date             DATETIME2     NOT NULL,
    CONSTRAINT PK_Transactions PRIMARY KEY (Id),
    CONSTRAINT FK_Transactions_Accounts_SenderAccountId FOREIGN KEY (SenderAccountId)
        REFERENCES dbo.Accounts (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Transactions_Accounts_ReceiverAccountId FOREIGN KEY (ReceiverAccountId)
        REFERENCES dbo.Accounts (Id) ON DELETE NO ACTION
);
GO

CREATE INDEX IX_Transactions_SenderAccountId   ON dbo.Transactions (SenderAccountId);
CREATE INDEX IX_Transactions_ReceiverAccountId ON dbo.Transactions (ReceiverAccountId);
GO

-- ============================================================
-- TABLO: FraudLogs
-- ============================================================
CREATE TABLE dbo.FraudLogs (
    Id          INT           IDENTITY(1,1) NOT NULL,
    AccountId   INT           NOT NULL,
    RiskType    NVARCHAR(MAX) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    LogDate     DATETIME2     NOT NULL,
    CONSTRAINT PK_FraudLogs PRIMARY KEY (Id),
    CONSTRAINT FK_FraudLogs_Accounts_AccountId FOREIGN KEY (AccountId)
        REFERENCES dbo.Accounts (Id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_FraudLogs_AccountId ON dbo.FraudLogs (AccountId);
GO

-- ============================================================
-- TABLO: LedgerEntries (IMMUTABLE - Asla silinmez/guncellenmez)
-- ============================================================
CREATE TABLE dbo.LedgerEntries (
    Id              INT           IDENTITY(1,1) NOT NULL,
    AccountId       INT           NOT NULL,
    Amount          DECIMAL(18,2) NOT NULL,
    PreviousBalance DECIMAL(18,2) NOT NULL,
    NewBalance      DECIMAL(18,2) NOT NULL,
    Description     NVARCHAR(MAX) NOT NULL,
    CreatedAt       DATETIME2     NOT NULL,
    CONSTRAINT PK_LedgerEntries PRIMARY KEY (Id),
    CONSTRAINT FK_LedgerEntries_Accounts_AccountId FOREIGN KEY (AccountId)
        REFERENCES dbo.Accounts (Id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_LedgerEntries_AccountId ON dbo.LedgerEntries (AccountId);
GO

-- ============================================================
-- EF MIGRATIONS HISTORY
-- ============================================================
CREATE TABLE dbo.__EFMigrationsHistory (
    MigrationId    NVARCHAR(150) NOT NULL,
    ProductVersion NVARCHAR(32)  NOT NULL,
    CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY (MigrationId)
);
GO

INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion) VALUES
('20260413165306_InitialCreate_SqlServer', '8.0.25'),
('20260413222811_FixLedgerSeedData',       '8.0.25');
GO

-- ============================================================
-- SEED DATA
-- ============================================================

SET IDENTITY_INSERT dbo.Users ON;
INSERT INTO dbo.Users (Id, Name, Surname, Email, Password) VALUES
(1, 'Cavit Batu', 'Soylu',  'cavitbatu@vireon.com', '123456'),
(2, 'Enes',       'Kaya',   'enes@vireon.com',       '123456'),
(3, 'Kerem',      'Arslan', 'kerem@vireon.com',      '123456');
SET IDENTITY_INSERT dbo.Users OFF;
GO

SET IDENTITY_INSERT dbo.Accounts ON;
INSERT INTO dbo.Accounts (Id, UserId, AccountNumber, Balance, Currency) VALUES
(1, 1, 'VR-1001', 15000.00, 'TRY'),
(2, 2, 'VR-1002',  8500.00, 'TRY'),
(3, 3, 'VR-1003',  3200.00, 'TRY');
SET IDENTITY_INSERT dbo.Accounts OFF;
GO

SET IDENTITY_INSERT dbo.DailyLimits ON;
INSERT INTO dbo.DailyLimits (Id, UserId, MaxDailyLimit, UsedLimit, LastResetDate) VALUES
(1, 1, 50000.00, 1500.00, '2026-04-04 00:00:00'),
(2, 2, 25000.00,    0.00, '2026-04-04 00:00:00'),
(3, 3, 10000.00,  500.00, '2026-04-04 00:00:00');
SET IDENTITY_INSERT dbo.DailyLimits OFF;
GO

SET IDENTITY_INSERT dbo.Transactions ON;
INSERT INTO dbo.Transactions (Id, SenderAccountId, ReceiverAccountId, Amount, Date) VALUES
(1, 1, 2, 1000.00, '2026-04-01 00:00:00'),
(2, 2, 3,  500.00, '2026-04-02 00:00:00'),
(3, 1, 3,  250.00, '2026-04-03 00:00:00');
SET IDENTITY_INSERT dbo.Transactions OFF;
GO

SET IDENTITY_INSERT dbo.FraudLogs ON;
INSERT INTO dbo.FraudLogs (Id, AccountId, RiskType, Description, LogDate) VALUES
(1, 1, 'Low',    'Normal islem',                       '2026-04-01 00:00:00'),
(2, 2, 'Medium', 'Yuksek tutarli islem tespit edildi', '2026-04-02 00:00:00');
SET IDENTITY_INSERT dbo.FraudLogs OFF;
GO

SET IDENTITY_INSERT dbo.LedgerEntries ON;
INSERT INTO dbo.LedgerEntries (Id, AccountId, Amount, PreviousBalance, NewBalance, Description, CreatedAt) VALUES
(1, 1, -1000.00, 16000.00, 15000.00, 'VR-1002 hesabina havale',   '2026-04-01 00:00:00'),
(2, 2,  1000.00,  7500.00,  8500.00, 'VR-1001 hesabindan havale', '2026-04-01 00:00:00'),
(3, 2,  -500.00,  8500.00,  8000.00, 'VR-1003 hesabina havale',   '2026-04-02 00:00:00'),
(4, 3,   500.00,  2700.00,  3200.00, 'VR-1002 hesabindan havale', '2026-04-02 00:00:00');
SET IDENTITY_INSERT dbo.LedgerEntries OFF;
GO

-- ============================================================
-- KONTROL
-- ============================================================
SELECT 'Users'        AS Tablo, COUNT(*) AS Kayit FROM dbo.Users
UNION ALL
SELECT 'Accounts',      COUNT(*) FROM dbo.Accounts
UNION ALL
SELECT 'DailyLimits',   COUNT(*) FROM dbo.DailyLimits
UNION ALL
SELECT 'Transactions',  COUNT(*) FROM dbo.Transactions
UNION ALL
SELECT 'FraudLogs',     COUNT(*) FROM dbo.FraudLogs
UNION ALL
SELECT 'LedgerEntries', COUNT(*) FROM dbo.LedgerEntries;
GO
