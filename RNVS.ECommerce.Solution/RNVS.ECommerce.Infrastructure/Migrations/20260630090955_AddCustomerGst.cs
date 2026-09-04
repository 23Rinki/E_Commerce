using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerGst : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomerGSTIN",
                table: "Order",
                type: "character varying(15)",
                maxLength: 15,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GstNumber",
                table: "AspNetUsers",
                type: "character varying(15)",
                maxLength: 15,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerGSTIN",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "GstNumber",
                table: "AspNetUsers");
        }
    }
}
