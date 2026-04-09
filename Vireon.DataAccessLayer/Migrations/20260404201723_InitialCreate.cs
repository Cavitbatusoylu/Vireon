using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Vireon.DataAccessLayer.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Surname = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Password = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Accounts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    AccountNumber = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Balance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Accounts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "DailyLimits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    MaxDailyLimit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UsedLimit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LastResetDate = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyLimits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyLimits_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "FraudLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AccountId = table.Column<int>(type: "int", nullable: false),
                    RiskType = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LogDate = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FraudLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FraudLogs_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "LedgerEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AccountId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PreviousBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    NewBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Description = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LedgerEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LedgerEntries_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    SenderAccountId = table.Column<int>(type: "int", nullable: false),
                    ReceiverAccountId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_ReceiverAccountId",
                        column: x => x.ReceiverAccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_SenderAccountId",
                        column: x => x.SenderAccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "Email", "Name", "Password", "Surname" },
                values: new object[,]
                {
                    { 1, "cavitbatu@vireon.com", "Cavit Batu", "123456", "Soylu" },
                    { 2, "enes@vireon.com", "Enes", "123456", "Kaya" },
                    { 3, "kerem@vireon.com", "Kerem", "123456", "Arslan" }
                });

            migrationBuilder.InsertData(
                table: "Accounts",
                columns: new[] { "Id", "AccountNumber", "Balance", "Currency", "UserId" },
                values: new object[,]
                {
                    { 1, "VR-1001", 15000m, "TRY", 1 },
                    { 2, "VR-1002", 8500m, "TRY", 2 },
                    { 3, "VR-1003", 3200m, "TRY", 3 }
                });

            migrationBuilder.InsertData(
                table: "DailyLimits",
                columns: new[] { "Id", "LastResetDate", "MaxDailyLimit", "UsedLimit", "UserId" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 4, 4, 0, 0, 0, 0, DateTimeKind.Unspecified), 50000m, 1500m, 1 },
                    { 2, new DateTime(2026, 4, 4, 0, 0, 0, 0, DateTimeKind.Unspecified), 25000m, 0m, 2 },
                    { 3, new DateTime(2026, 4, 4, 0, 0, 0, 0, DateTimeKind.Unspecified), 10000m, 500m, 3 }
                });

            migrationBuilder.InsertData(
                table: "FraudLogs",
                columns: new[] { "Id", "AccountId", "Description", "LogDate", "RiskType" },
                values: new object[,]
                {
                    { 1, 1, "Normal işlem", new DateTime(2026, 4, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Low" },
                    { 2, 2, "Yüksek tutarlı işlem tespit edildi", new DateTime(2026, 4, 2, 0, 0, 0, 0, DateTimeKind.Unspecified), "Medium" }
                });

            migrationBuilder.InsertData(
                table: "LedgerEntries",
                columns: new[] { "Id", "AccountId", "Amount", "CreatedAt", "Description", "NewBalance", "PreviousBalance" },
                values: new object[,]
                {
                    { 1, 1, -1000m, new DateTime(2026, 4, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "VR-1002 hesabına havale", 15000m, 16000m },
                    { 2, 2, 1000m, new DateTime(2026, 4, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "VR-1001 hesabından havale", 8500m, 7500m },
                    { 3, 2, -500m, new DateTime(2026, 4, 2, 0, 0, 0, 0, DateTimeKind.Unspecified), "VR-1003 hesabına havale", 8500m, 9000m },
                    { 4, 3, 500m, new DateTime(2026, 4, 2, 0, 0, 0, 0, DateTimeKind.Unspecified), "VR-1002 hesabından havale", 3200m, 2700m }
                });

            migrationBuilder.InsertData(
                table: "Transactions",
                columns: new[] { "Id", "Amount", "Date", "ReceiverAccountId", "SenderAccountId" },
                values: new object[,]
                {
                    { 1, 1000m, new DateTime(2026, 4, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 2, 1 },
                    { 2, 500m, new DateTime(2026, 4, 2, 0, 0, 0, 0, DateTimeKind.Unspecified), 3, 2 },
                    { 3, 250m, new DateTime(2026, 4, 3, 0, 0, 0, 0, DateTimeKind.Unspecified), 3, 1 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_UserId",
                table: "Accounts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyLimits_UserId",
                table: "DailyLimits",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FraudLogs_AccountId",
                table: "FraudLogs",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_LedgerEntries_AccountId",
                table: "LedgerEntries",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_ReceiverAccountId",
                table: "Transactions",
                column: "ReceiverAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_SenderAccountId",
                table: "Transactions",
                column: "SenderAccountId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyLimits");

            migrationBuilder.DropTable(
                name: "FraudLogs");

            migrationBuilder.DropTable(
                name: "LedgerEntries");

            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropTable(
                name: "Accounts");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
