using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vireon.DataAccessLayer.Migrations
{
    /// <inheritdoc />
    public partial class FixLedgerSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "LedgerEntries",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "NewBalance", "PreviousBalance" },
                values: new object[] { 8000m, 8500m });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "LedgerEntries",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "NewBalance", "PreviousBalance" },
                values: new object[] { 8500m, 9000m });
        }
    }
}
