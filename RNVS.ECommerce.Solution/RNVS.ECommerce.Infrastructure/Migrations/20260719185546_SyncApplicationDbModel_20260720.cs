using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncApplicationDbModel_20260720 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShippingCity",
                table: "Order",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingCountry",
                table: "Order",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingName",
                table: "Order",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingPhone",
                table: "Order",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingPostalCode",
                table: "Order",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingState",
                table: "Order",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingStreet",
                table: "Order",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShippingCity",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ShippingCountry",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ShippingName",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ShippingPhone",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ShippingPostalCode",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ShippingState",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ShippingStreet",
                table: "Order");
        }
    }
}
