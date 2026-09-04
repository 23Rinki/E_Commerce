using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Analytics;
using RNVS.ECommerce.Domain.Entities.Platform;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Domain.Entities.Vendor;

namespace RNVS.ECommerce.Infrastructure.Data;

/// <summary>
/// Master / shared database context.
/// Contains only platform-level data:
///   - ASP.NET Identity (vendors + customers only — NOT employees)
///   - TenantRegistrations (vendor → their DB connection)
///   - EmployeeEmailIndex (email → vendorId routing, no passwords)
/// </summary>
public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    /// <summary>Vendor tenant registry — maps vendor to their database.</summary>
    public DbSet<TenantRegistration> TenantRegistrations { get; set; }

    /// <summary>Vendor bank account details for payout processing.</summary>
    public DbSet<VendorBankAccount> VendorBankAccounts { get; set; }

    /// <summary>Audit log of vendors who were permanently removed from the platform.</summary>
    public DbSet<RemovedVendorRecord> RemovedVendorRecords { get; set; }

    /// <summary>
    /// Platform-wide analytics. Written on every product view (guests + customers).
    /// Vendor-level copy also lives in each vendor's own DB for their analytics dashboard.
    /// </summary>
    public DbSet<UserBehavior> UserBehaviors { get; set; }

    /// <summary>
    /// Employee email routing table.
    /// Used only during employee login to find which vendor DB to authenticate against.
    /// Contains no passwords — just email → vendorId mapping.
    /// </summary>
    public DbSet<EmployeeEmailIndex> EmployeeEmailIndex { get; set; }

    /// <summary>Admin-editable list of words that auto-flag a product on submission.</summary>
    public DbSet<BannedWord> BannedWords { get; set; }

    /// <summary>Review queue for auto-flagged or customer-reported products.</summary>
    public DbSet<ModerationFlag> ModerationFlags { get; set; }

    /// <summary>Audit trail of images removed by admin moderation — file is archived, this is the paper trail.</summary>
    public DbSet<RemovedProductImage> RemovedProductImages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        modelBuilder.Entity<EmployeeEmailIndex>(e =>
        {
            e.ToTable("EmployeeEmailIndex");
            e.HasKey(x => x.Email);
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.VendorId).IsRequired().HasMaxLength(450);
            e.HasIndex(x => x.VendorId);
        });
    }
}
