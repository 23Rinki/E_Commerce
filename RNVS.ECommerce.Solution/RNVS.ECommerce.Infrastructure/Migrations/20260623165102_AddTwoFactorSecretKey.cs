using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTwoFactorSecretKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TwoFactorSecretKey",
                table: "AspNetUsers",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TwoFactorSecretKey",
                table: "AspNetUsers");
        }
    }
}
