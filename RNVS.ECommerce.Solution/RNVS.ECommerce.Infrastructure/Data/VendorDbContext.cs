using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Analytics;
using RNVS.ECommerce.Domain.Entities.Inventory;
using RNVS.ECommerce.Domain.Entities.Notification;
using RNVS.ECommerce.Domain.Entities.Order;
using RNVS.ECommerce.Domain.Entities.Payment;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Domain.Entities.Receipt;
using RNVS.ECommerce.Domain.Entities.Shopping;
using RNVS.ECommerce.Domain.Entities.System;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Domain.Entities.Vendor;

namespace RNVS.ECommerce.Infrastructure.Data;

/// <summary>
/// Vendor-specific database context.
/// Each vendor gets their own isolated database — this context connects to it.
/// Connection string is resolved dynamically per HTTP request via TenantContext.
///
/// Phase 1: all vendors share one DB (default connection string).
/// Phase 2: vendors with a dedicated DB URL get their own isolated database.
/// </summary>
public class VendorDbContext : DbContext
{
    public VendorDbContext(DbContextOptions<VendorDbContext> options) : base(options) { }

    // User (vendor-specific)
    public DbSet<CompanyProfile> CompanyProfiles { get; set; }
    public DbSet<Employee> Employees { get; set; }

    // Product
    public DbSet<Product> Products { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<ProductImage> ProductImages { get; set; }
    public DbSet<ProductVariant> ProductVariants { get; set; }
    public DbSet<Review> Reviews { get; set; }

    // Shopping
    public DbSet<Cart> Carts { get; set; }
    public DbSet<CartItem> CartItems { get; set; }
    public DbSet<Wishlist> Wishlists { get; set; }

    // Order
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }
    public DbSet<Address> Addresses { get; set; }

    // Payment
    public DbSet<Domain.Entities.Payment.Payment> Payments { get; set; }
    public DbSet<PaymentMethod> PaymentMethods { get; set; }

    // Receipt
    public DbSet<InvoiceTemplate> InvoiceTemplates { get; set; }
    public DbSet<CustomReceipt> CustomReceipts { get; set; }
    public DbSet<BrandingSettings> BrandingSettings { get; set; }

    // Inventory
    public DbSet<Stock> Stocks { get; set; }
    public DbSet<InventoryTransaction> InventoryTransactions { get; set; }

    // Vendor
    public DbSet<VendorPayout> VendorPayouts { get; set; }
    public DbSet<VendorPayoutItem> VendorPayoutItems { get; set; }

    // Notification
    public DbSet<Domain.Entities.Notification.Notification> Notifications { get; set; }
    public DbSet<EmailQueue> EmailQueues { get; set; }

    // System
    public DbSet<ActivityLog> ActivityLogs { get; set; }
    public DbSet<PlatformSetting> PlatformSettings { get; set; }

    // Analytics
    public DbSet<UserBehavior> UserBehaviors { get; set; }
    public DbSet<ProductViewHistory> ProductViewHistories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(VendorDbContext).Assembly);
    }
}
