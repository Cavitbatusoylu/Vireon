using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vireon.DataAccessLayer.Migrations
{
    /// <summary>
    /// Grup 3 — Admin/User rolü (Users.Role, varsayılan: User).
    /// </summary>
    public partial class AddUserRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Users",
                type: "TEXT",
                nullable: false,
                defaultValue: "User");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Role",
                table: "Users");
        }
    }
}
