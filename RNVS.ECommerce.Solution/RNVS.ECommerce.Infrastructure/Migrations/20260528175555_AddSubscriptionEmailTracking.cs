using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionEmailTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastMonthlyReminderSentAt",
                table: "TenantRegistrations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubscriptionType",
                table: "TenantRegistrations",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "TransitionEmailSentAt",
                table: "TenantRegistrations",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastMonthlyReminderSentAt",
                table: "TenantRegistrations");

            migrationBuilder.DropColumn(
                name: "SubscriptionType",
                table: "TenantRegistrations");

            migrationBuilder.DropColumn(
                name: "TransitionEmailSentAt",
                table: "TenantRegistrations");
        }
    }
}
