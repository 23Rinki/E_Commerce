using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations.VendorDb
{
    /// <inheritdoc />
    public partial class AddInvoiceTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // No-op: "InvoiceTemplates" is already created by the InitialVendorSchema migration
            // (20260331195105) with this exact same shape. This migration originally duplicated
            // that CreateTable call, which crashes with "relation already exists" on any database
            // that applies migrations in order from scratch (e.g. a brand-new vendor signup, or a
            // fresh deployment) — it only ever worked on databases where InvoiceTemplates had been
            // created out-of-band beforehand. Left as a neutered no-op rather than deleted so
            // existing databases that already recorded this migration as applied are unaffected.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op — see Up().
        }
    }
}
