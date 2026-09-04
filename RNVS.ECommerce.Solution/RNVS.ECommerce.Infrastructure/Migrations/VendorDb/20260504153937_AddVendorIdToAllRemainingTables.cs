using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations.VendorDb
{
    /// <inheritdoc />
    public partial class AddVendorIdToAllRemainingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "VendorPayoutItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "UserBehaviors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "ProductViewHistories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "ProductImages",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "PaymentMethods",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "OrderStatusHistories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Notifications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "EmailQueues",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "CompanyProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Categories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Carts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "ActivityLogs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "VendorPayoutItems");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "UserBehaviors");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "ProductViewHistories");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "ProductImages");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "PaymentMethods");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "OrderStatusHistories");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "EmailQueues");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "CompanyProfiles");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Carts");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "ActivityLogs");
        }
    }
}
