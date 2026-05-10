-- VIREON SİSTEMİ: XAMPP / MySQL İÇİN VERİTABANI OLUŞTURMA SCRIPT'İ
-- Sorumlu: Cavit Batu Soylu (Database Görevi)
-- Açıklama: Projede yerel olarak SQLite çalışırken, jüri kontrolü ve XAMPP ortamı için MySQL spesifik veritabanı yapısını oluşturur.
-- Kullanım: Bu dosyayı phpMyAdmin üzerinden "İçe Aktar (Import)" yaparak VireonDB'yi anında hazır edebilirsiniz.

-- 1) VERİTABANI OLUŞTURULMASI
CREATE DATABASE IF NOT EXISTS `VireonDB` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `VireonDB`;

-- 2) USERS TABLOSU
CREATE TABLE IF NOT EXISTS `Users` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Surname` varchar(100) NOT NULL,
  `Email` varchar(255) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `AccountNumber` varchar(50) NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_Users_Email` (`Email`),
  UNIQUE KEY `IX_Users_AccountNumber` (`AccountNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) ACCOUNTS TABLOSU
CREATE TABLE IF NOT EXISTS `Accounts` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `AccountNumber` varchar(50) NOT NULL,
  `Balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `Currency` varchar(10) NOT NULL DEFAULT 'TRY',
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_Accounts_AccountNumber` (`AccountNumber`),
  KEY `IX_Accounts_UserId` (`UserId`),
  CONSTRAINT `FK_Accounts_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) DAILY LIMITS TABLOSU
CREATE TABLE IF NOT EXISTS `DailyLimits` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `MaxDailyLimit` decimal(18,2) NOT NULL DEFAULT '100000.00',
  `UsedLimit` decimal(18,2) NOT NULL DEFAULT '0.00',
  `LastResetDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_DailyLimits_UserId` (`UserId`),
  CONSTRAINT `FK_DailyLimits_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) TRANSACTIONS TABLOSU
CREATE TABLE IF NOT EXISTS `Transactions` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `SenderAccountId` int NOT NULL,
  `ReceiverAccountId` int NOT NULL,
  `Amount` decimal(18,2) NOT NULL,
  `Date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Status` varchar(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`Id`),
  KEY `IX_Transactions_SenderAccountId` (`SenderAccountId`),
  KEY `IX_Transactions_ReceiverAccountId` (`ReceiverAccountId`),
  KEY `IX_Transactions_Date` (`Date`),
  CONSTRAINT `FK_Transactions_Accounts_ReceiverAccountId` FOREIGN KEY (`ReceiverAccountId`) REFERENCES `Accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_Transactions_Accounts_SenderAccountId` FOREIGN KEY (`SenderAccountId`) REFERENCES `Accounts` (`Id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6) LEDGER ENTRIES TABLOSU (Değişmez Muhasebe Defteri)
CREATE TABLE IF NOT EXISTS `LedgerEntries` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `AccountId` int NOT NULL,
  `Amount` decimal(18,2) NOT NULL,
  `PreviousBalance` decimal(18,2) NOT NULL,
  `NewBalance` decimal(18,2) NOT NULL,
  `Description` varchar(500) NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  KEY `IX_LedgerEntries_AccountId` (`AccountId`),
  KEY `IX_LedgerEntries_CreatedAt` (`CreatedAt`),
  CONSTRAINT `FK_LedgerEntries_Accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7) FRAUD LOGS TABLOSU (Dolandırıcılık Kayıtları)
CREATE TABLE IF NOT EXISTS `FraudLogs` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `AccountId` int NOT NULL,
  `RiskType` varchar(100) NOT NULL,
  `Description` varchar(500) NOT NULL,
  `LogDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`),
  KEY `IX_FraudLogs_AccountId` (`AccountId`),
  CONSTRAINT `FK_FraudLogs_Accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8) AYNI TEST VERİLERİNİ (SEED DATA) MYSQL'E DE BASIYORUZ
INSERT INTO `Users` (`Id`, `Name`, `Surname`, `Email`, `Password`, `AccountNumber`) VALUES
(1, 'Ahmet', 'Yılmaz', 'ahmet.yilmaz@vireon.com', '$2a$11$eO.hK7q3G/eGq5i1L9P.hOGv7H1q7zV5a0Y6QjK6l8T1X3v2QGZmO', 'VR-1001'),
(2, 'Ayşe', 'Demir', 'ayse.demir@vireon.com', '$2a$11$eO.hK7q3G/eGq5i1L9P.hOGv7H1q7zV5a0Y6QjK6l8T1X3v2QGZmO', 'VR-1002'),
(3, 'Admin', 'Vireon', 'admin@vireon.com', '$2a$11$eO.hK7q3G/eGq5i1L9P.hOGv7H1q7zV5a0Y6QjK6l8T1X3v2QGZmO', 'VR-9999');

INSERT INTO `Accounts` (`Id`, `UserId`, `AccountNumber`, `Balance`, `Currency`) VALUES
(1, 1, 'TR1001', 50000.00, 'TRY'),
(2, 2, 'TR1002', 75000.00, 'TRY'),
(3, 3, 'TR9999', 9000000.00, 'TRY');

INSERT INTO `DailyLimits` (`UserId`, `MaxDailyLimit`, `UsedLimit`) VALUES
(1, 100000.00, 0.00),
(2, 100000.00, 0.00),
(3, 5000000.00, 0.00);

-- XAMPP MYSQL KURULUMU TAMAMLANMIŞTIR --
