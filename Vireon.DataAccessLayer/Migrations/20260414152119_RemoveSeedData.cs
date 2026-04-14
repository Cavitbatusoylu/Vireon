using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Vireon.DataAccessLayer.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "DailyLimits",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "DailyLimits",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "DailyLimits",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "FraudLogs",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "FraudLogs",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "LedgerEntries",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "LedgerEntries",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "LedgerEntries",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "LedgerEntries",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Transactions",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Transactions",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Transactions",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Accounts",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Accounts",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Accounts",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
                    { 3, 2, -500m, new DateTime(2026, 4, 2, 0, 0, 0, 0, DateTimeKind.Unspecified), "VR-1003 hesabına havale", 8000m, 8500m },
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
        }
    }
}
