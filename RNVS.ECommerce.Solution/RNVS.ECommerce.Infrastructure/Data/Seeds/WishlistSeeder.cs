using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Shopping;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class WishlistSeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Get a customer user
        var customer = new { Id = adminUserId };

        if (customer == null)
        {
            return; // No user to create wishlist for
        }

        // Check if wishlist items already exist for this user
        if (await context.Wishlists.AnyAsync(w => w.UserId == customer.Id))
        {
            return; // Wishlist already exists
        }

        // Get some products to add to wishlist (different from cart items)
        var products = await context.Products.Skip(3).Take(4).ToListAsync();

        if (!products.Any())
        {
            return; // No products to add to wishlist
        }

        var wishlistItems = new List<Wishlist>();

        foreach (var product in products)
        {
            wishlistItems.Add(new Wishlist
            {
                UserId = customer.Id,
                ProductId = product.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-Random.Shared.Next(1, 15))
            });
        }

        if (wishlistItems.Any())
        {
            await context.Wishlists.AddRangeAsync(wishlistItems);
            await context.SaveChangesAsync();
        }
    }
}
