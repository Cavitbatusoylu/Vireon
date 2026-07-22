<div align="center">

<img src="src/Vireon.PresentationLayer/wwwroot/images/vireon-logo-transparent-new.png" alt="Vireon Logo" width="200">

# Vireon Digital Banking Core

*A modern, database-centric digital bank core system simulation featuring ACID-compliant transfers, an immutable ledger, fraud detection, and an AI-powered assistant.*

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

[Explore the API](#api-reference) · [Report Bug](#) · [Request Feature](#)

</div>

<hr/>

## ✨ Key Features

* **ACID Compliant Transactions:** Ensures complete reliability for money transfers, deposits, and balance management.
* **Immutable Ledger (`LedgerEntries`):** A strictly append-only accounting ledger that records every financial movement for auditability.
* **Rule-Based Fraud Detection:** Real-time monitoring and logging (`FraudLogs`) to detect suspicious activity and enforce daily transfer limits.
* **Neon AI Assistant:** Built-in intelligent assistant powered by Groq (optional configuration).
* **Modern Web Interface:** Fully responsive, PWA-ready dashboard with localization support (EN/TR).
* **Robust Security:** Passwords hashed via BCrypt, rigorous input validation using FluentValidation.

## 🏗 Architecture (N-Layer)

Vireon follows a strict N-Layer architecture to ensure separation of concerns and maintainability:

```text
Vireon/
├── src/
│   ├── Vireon.EntityLayer/          # Domain models and enums
│   ├── Vireon.DataAccessLayer/      # EF Core, migrations, and DbContext
│   ├── Vireon.DtoLayer/             # Data Transfer Objects (DTOs)
│   ├── Vireon.BusinessLayer/        # Business logic, TransactionManager, Fraud detection
│   └── Vireon.PresentationLayer/    # REST API endpoints & UI (wwwroot)
├── Database/                        # Local SQLite database
└── scripts/                         # Build & deployment scripts
```

## 🚀 Getting Started

### Prerequisites
* [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vireon/Vireon.git
   cd Vireon
   ```

2. **Run the Application**
   ```bash
   cd src/Vireon.PresentationLayer
   dotnet run
   ```

3. **Open in Browser**
   Navigate to `http://localhost:5202`

> **Note:** The local SQLite database will be automatically created and seeded with default data upon the first run.

### Configuring Neon AI (Optional)

To enable the Neon AI assistant, configure your Groq API key:

```bash
cd src/Vireon.PresentationLayer
cp appsettings.Development.json.example appsettings.Development.json
```
*Edit `appsettings.Development.json` and insert your API key.*

## 📚 API Reference

| Domain | Endpoint | Method |
|--------|----------|--------|
| **Auth** | `/api/users/register` | `POST` |
| **Auth** | `/api/users/login` | `POST` |
| **Transfers** | `/api/transfers` | `POST` |
| **Ledger** | `/api/transactions` | `GET` |
| **Account** | `/api/users/{id}/delete-account` | `POST` |

## 🛠 Tech Stack

* **Backend:** ASP.NET Core 8, C#, Entity Framework Core
* **Database:** SQLite
* **Security:** BCrypt
* **Libraries:** FluentValidation, AutoMapper, Serilog
* **Frontend:** HTML5, CSS3 (Vanilla), JavaScript, Chart.js, Progressive Web App (PWA)

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <i>Built with passion by the Vireon Team.</i>
</div>
