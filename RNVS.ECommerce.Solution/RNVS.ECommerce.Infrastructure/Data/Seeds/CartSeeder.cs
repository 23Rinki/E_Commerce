using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Shopping;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class CartSeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Get a customer user
        var customer = new { Id = adminUserId };

        if (customer == null)
        {
            return; // No user to create cart for
        }

        // Check if cart already exists for this user
        if (await context.Carts.AnyAsync(c => c.UserId == customer.Id))
        {
            return; // Cart already exists
        }

        // Create cart
        var cart = new Cart
        {
            UserId = customer.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await context.Carts.AddAsync(cart);
        await context.SaveChangesAsync();

        // Get some products to add to cart
        var products = await context.Products.Take(3).ToListAsync();

        if (!products.Any())
        {
            return; // No products to add to cart
        }

        var cartItems = new List<CartItem>();

        // Add first 3 products to cart
        if (products.Count > 0)
        {
            cartItems.Add(new CartItem
            {
                CartId = cart.Id,
                ProductId = products[0].Id,
                Quantity = 2,
                UnitPrice = products[0].Price,
                AddedAt = DateTime.UtcNow.AddDays(-2)
            });
        }

        if (products.Count > 1)
        {
            cartItems.Add(new CartItem
            {
                CartId = cart.Id,
                ProductId = products[1].Id,
                Quantity = 1,
                UnitPrice = products[1].Price,
                AddedAt = DateTime.UtcNow.AddDays(-1)
            });
        }

        if (products.Count > 2)
        {
            cartItems.Add(new CartItem
            {
                CartId = cart.Id,
                ProductId = products[2].Id,
                Quantity = 3,
                UnitPrice = products[2].Price,
                AddedAt = DateTime.UtcNow
            });
        }

        if (cartItems.Any())
        {
            await context.CartItems.AddRangeAsync(cartItems);
            await context.SaveChangesAsync();
        }
    }
}
