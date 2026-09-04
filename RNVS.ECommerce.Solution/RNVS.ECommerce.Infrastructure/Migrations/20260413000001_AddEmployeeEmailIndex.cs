using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeEmailIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmployeeEmailIndex",
                columns: table => new
                {
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    VendorId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeEmailIndex", x => x.Email);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmailIndex_VendorId",
                table: "EmployeeEmailIndex",
                column: "VendorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "EmployeeEmailIndex");
        }
    }
}
