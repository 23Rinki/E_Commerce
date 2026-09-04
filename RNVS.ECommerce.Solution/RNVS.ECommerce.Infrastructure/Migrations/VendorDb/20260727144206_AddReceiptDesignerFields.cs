using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations.VendorDb
{
    /// <inheritdoc />
    public partial class AddReceiptDesignerFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CgstPercent",
                table: "BrandingSettings",
                type: "numeric",
                nullable: false,
                defaultValue: 50m);

            migrationBuilder.AddColumn<string>(
                name: "FooterNote",
                table: "BrandingSettings",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "IgstPercent",
                table: "BrandingSettings",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "QrValue",
                table: "BrandingSettings",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SgstPercent",
                table: "BrandingSettings",
                type: "numeric",
                nullable: false,
                defaultValue: 50m);

            migrationBuilder.AddColumn<bool>(
                name: "ShowBarcode",
                table: "BrandingSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowQrCode",
                table: "BrandingSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureImageUrl",
                table: "BrandingSettings",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureText",
                table: "BrandingSettings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TemplateStyle",
                table: "BrandingSettings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "classic");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CgstPercent",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "FooterNote",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "IgstPercent",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "QrValue",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "SgstPercent",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "ShowBarcode",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "ShowQrCode",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "SignatureImageUrl",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "SignatureText",
                table: "BrandingSettings");

            migrationBuilder.DropColumn(
                name: "TemplateStyle",
                table: "BrandingSettings");
        }
    }
}
