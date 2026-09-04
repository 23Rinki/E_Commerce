using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations.VendorDb
{
    /// <inheritdoc />
    public partial class AddReceiptFieldsToBrandingSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BillFieldsJson",
                table: "BrandingSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerFieldsJson",
                table: "BrandingSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GstNumber",
                table: "BrandingSettings",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoreAddress",
                table: "BrandingSettings",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoreEmail",
                table: "BrandingSettings",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoreName",
                table: "BrandingSettings",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StorePhone",
                table: "BrandingSettings",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "BrandingSettings",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BillFieldsJson",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "CustomerFieldsJson",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "GstNumber",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "StoreAddress",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "StoreEmail",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "StoreName",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "StorePhone",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "BrandingSettings");
        }
    }
}
