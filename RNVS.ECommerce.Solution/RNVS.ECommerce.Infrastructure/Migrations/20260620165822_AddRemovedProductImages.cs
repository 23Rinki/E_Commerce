using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRemovedProductImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RemovedProductImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VendorId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    VendorName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    ProductName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OriginalImagePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ArchivedImagePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RemovedBy = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    RemovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RemovedProductImages", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RemovedProductImages");
        }
    }
}
