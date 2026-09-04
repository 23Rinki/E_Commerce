using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data.Seeds;

namespace RNVS.ECommerce.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(
        ApplicationDbContext masterContext,
        VendorDbContext vendorContext,
        UserManager<ApplicationUser> userManager)
    {
        // Migrate shared (master) DB — Identity + TenantRegistrations
        await masterContext.Database.MigrateAsync();

        // Migrate shared vendor DB (for Phase 1 when no dedicated DB is set)
        await vendorContext.Database.MigrateAsync();

        // Ensure Super Admin always exists
        if (!masterContext.Users.Any(u => u.Email == "rinkeeverma23@gmail.com"))
        {
            var superAdmin = new ApplicationUser
            {
                UserName = "rinkeeverma23@gmail.com",
                Email = "rinkeeverma23@gmail.com",
                FirstName = "Admin",
                LastName = "User",
                EmailConfirmed = true,
                IsActive = true,
                Role = UserRole.SuperAdmin,
                CreatedAt = DateTime.UtcNow
            };

            await userManager.CreateAsync(superAdmin, "$Inkee123");
            await masterContext.SaveChangesAsync();
        }

        // Resolve admin user ID for seeders that need a user reference
        var adminId = masterContext.Users
            .Where(u => u.Role == UserRole.SuperAdmin)
            .Select(u => u.Id)
            .FirstOrDefault() ?? "admin";

        // Seed vendor data into shared vendor DB
        await CategorySeeder.SeedAsync(vendorContext);
        await ProductSeeder.SeedAsync(vendorContext, adminId);
        await ProductImageSeeder.SeedAsync(vendorContext);
        await ProductVariantSeeder.SeedAsync(vendorContext);
        await StockSeeder.SeedAsync(vendorContext);
        await InventoryTransactionSeeder.SeedAsync(vendorContext, adminId);
        await AddressSeeder.SeedAsync(vendorContext, adminId);
        await PaymentMethodSeeder.SeedAsync(vendorContext, adminId);
        await ReviewSeeder.SeedAsync(vendorContext, adminId);
        await CartSeeder.SeedAsync(vendorContext, adminId);
        await WishlistSeeder.SeedAsync(vendorContext, adminId);
        await OrderSeeder.SeedAsync(vendorContext, adminId);
        await PaymentSeeder.SeedAsync(vendorContext);
        await OrderStatusHistorySeeder.SeedAsync(vendorContext, adminId);
    }
}
