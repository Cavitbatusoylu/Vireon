using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vireon.DataAccessLayer.Concrete.EntityFramework;

#nullable disable

namespace Vireon.DataAccessLayer.Migrations
{
    /// <inheritdoc />
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
