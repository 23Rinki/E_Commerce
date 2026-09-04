using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations.VendorDb
{
    /// <inheritdoc />
    public partial class AddCompanyProfileBusinessFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanyPanNumber",
                table: "CompanyProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GstNumber",
                table: "CompanyProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UdyamCertificateNumber",
                table: "CompanyProfiles",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompanyPanNumber",
                table: "CompanyProfiles");

            migrationBuilder.DropColumn(
                name: "GstNumber",
                table: "CompanyProfiles");

            migrationBuilder.DropColumn(
                name: "UdyamCertificateNumber",
                table: "CompanyProfiles");
        }
    }
}
