using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations.VendorDb
{
    /// <inheritdoc />
    public partial class AddCustomReceiptImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomReceiptImageUrl",
                table: "BrandingSettings",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomReceiptImageUrl",
                table: "BrandingSettings");
        }
    }
}
