using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vireon.DataAccessLayer.Migrations
{
    /// <summary>
    /// Grup 4 — Demo okunabilir şifre sütunu (Users.PlainPassword).
    /// </summary>
    public partial class AddPlainPassword : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PlainPassword",
                table: "Users",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlainPassword",
                table: "Users");
        }
    }
}
