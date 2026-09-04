using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVendorBankAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanyPanNumber",
                table: "CompanyProfile",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "CompanyProfile",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GstNumber",
                table: "CompanyProfile",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "CompanyProfile",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "CompanyProfile",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UdyamCertificateNumber",
                table: "CompanyProfile",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "VendorBankAccounts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VendorId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    AccountHolderName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BankName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AccountNumber = table.Column<string>(type: "character varying(18)", maxLength: 18, nullable: false),
                    IfscCode = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false),
                    AccountType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UpiId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VendorBankAccounts", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VendorBankAccounts");

            migrationBuilder.DropColumn(
                name: "CompanyPanNumber",
                table: "CompanyProfile");

            migrationBuilder.DropColumn(
                name: "FirstName",
                table: "CompanyProfile");

            migrationBuilder.DropColumn(
                name: "GstNumber",
                table: "CompanyProfile");

            migrationBuilder.DropColumn(
                name: "LastName",
                table: "CompanyProfile");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "CompanyProfile");

            migrationBuilder.DropColumn(
                name: "UdyamCertificateNumber",
                table: "CompanyProfile");
        }
    }
}
