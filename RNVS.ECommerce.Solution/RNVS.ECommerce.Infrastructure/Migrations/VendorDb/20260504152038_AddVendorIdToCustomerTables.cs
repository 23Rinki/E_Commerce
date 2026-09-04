using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations.VendorDb
{
    /// <inheritdoc />
    public partial class AddVendorIdToCustomerTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Wishlists",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Stocks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Reviews",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "OrderItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "InventoryTransactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "CartItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Addresses",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Wishlists");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Stocks");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "CartItems");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Addresses");
        }
    }
}
