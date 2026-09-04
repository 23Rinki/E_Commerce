using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class ProductSeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Get the first SuperAdmin user to use as vendor
        var superAdmin = new { Id = adminUserId };

        // Get category IDs
        var categories = await context.Categories.ToListAsync();
        var electronicsId = categories.First(c => c.Name == "Electronics").Id;
        var clothingId = categories.First(c => c.Name == "Clothing").Id;
        var homeKitchenId = categories.First(c => c.Name == "Home & Kitchen").Id;
        var booksId = categories.First(c => c.Name == "Books").Id;
        var sportsId = categories.First(c => c.Name == "Sports & Outdoors").Id;
        var toysId = categories.First(c => c.Name == "Toys & Games").Id;

        var products = new List<Product>
        {
            // Electronics
            new Product
            {
                Name = "iPhone 15 Pro 256GB",
                SKU = "IPH15P-256-BLK",
                Slug = "iphone-15-pro-256gb",
                Description = "Latest iPhone with A17 Pro chip, titanium design, and advanced camera system",
                Price = 1199.99m,
                BasePrice = 999.99m,
                StockQuantity = 50,
                ViewCount = 0,
                CategoryId = electronicsId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            new Product
            {
                Name = "Samsung Galaxy Buds Pro 2",
                SKU = "SGBP2-WHT",
                Slug = "samsung-galaxy-buds-pro-2",
                Description = "Premium wireless earbuds with active noise cancellation and 360 audio",
                Price = 229.99m,
                BasePrice = 229.99m,
                StockQuantity = 150,
                ViewCount = 0,
                CategoryId = electronicsId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            // Clothing
            new Product
            {
                Name = "Men's Cotton Casual Shirt - Blue",
                SKU = "MCS-BLU-L",
                Slug = "mens-cotton-casual-shirt-blue",
                Description = "100% cotton casual shirt, breathable and comfortable for everyday wear",
                Price = 39.99m,
                BasePrice = 39.99m,
                StockQuantity = 200,
                ViewCount = 0,
                CategoryId = clothingId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            new Product
            {
                Name = "Women's Skinny Denim Jeans - Black",
                SKU = "WDJ-BLK-28",
                Slug = "womens-skinny-denim-jeans-black",
                Description = "Stretch denim skinny jeans with high waist design",
                Price = 59.99m,
                BasePrice = 49.99m,
                StockQuantity = 120,
                ViewCount = 0,
                CategoryId = clothingId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            // Home & Kitchen
            new Product
            {
                Name = "Programmable Coffee Maker 12-Cup",
                SKU = "CM12-SS",
                Slug = "programmable-coffee-maker-12-cup",
                Description = "Stainless steel coffee maker with programmable timer and auto-shutoff",
                Price = 79.99m,
                BasePrice = 79.99m,
                StockQuantity = 75,
                ViewCount = 0,
                CategoryId = homeKitchenId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            new Product
            {
                Name = "Non-Stick Cookware Set 10-Piece",
                SKU = "CWS10-BLK",
                Slug = "non-stick-cookware-set-10-piece",
                Description = "Complete cookware set with pots, pans, and lids. PFOA-free non-stick coating",
                Price = 149.99m,
                BasePrice = 129.99m,
                StockQuantity = 45,
                ViewCount = 0,
                CategoryId = homeKitchenId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            // Books
            new Product
            {
                Name = "The Midnight Library - Hardcover",
                SKU = "BK-TML-HC",
                Slug = "the-midnight-library-hardcover",
                Description = "Bestselling novel by Matt Haig about infinite possibilities and second chances",
                Price = 24.99m,
                BasePrice = 24.99m,
                StockQuantity = 100,
                ViewCount = 0,
                CategoryId = booksId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            new Product
            {
                Name = "Clean Code: A Handbook of Agile Software Craftsmanship",
                SKU = "BK-CC-PB",
                Slug = "clean-code-handbook",
                Description = "Essential guide to writing clean, maintainable code by Robert C. Martin",
                Price = 44.99m,
                BasePrice = 44.99m,
                StockQuantity = 60,
                ViewCount = 0,
                CategoryId = booksId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            // Sports & Outdoors
            new Product
            {
                Name = "Premium Yoga Mat - Extra Thick",
                SKU = "YM-PRP-6MM",
                Slug = "premium-yoga-mat-extra-thick",
                Description = "6mm thick non-slip yoga mat with carrying strap, eco-friendly material",
                Price = 34.99m,
                BasePrice = 29.99m,
                StockQuantity = 180,
                ViewCount = 0,
                CategoryId = sportsId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            new Product
            {
                Name = "Adjustable Dumbbell Set 20-50 lbs",
                SKU = "DBS-ADJ-50",
                Slug = "adjustable-dumbbell-set-50lbs",
                Description = "Space-saving adjustable dumbbells with quick weight selection dial",
                Price = 299.99m,
                BasePrice = 279.99m,
                StockQuantity = 30,
                ViewCount = 0,
                CategoryId = sportsId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            // Toys & Games
            new Product
            {
                Name = "LEGO Creator Expert Set",
                SKU = "LEGO-CE-1000",
                Slug = "lego-creator-expert-set",
                Description = "Advanced LEGO building set with 1000+ pieces for ages 12+",
                Price = 89.99m,
                BasePrice = 89.99m,
                StockQuantity = 85,
                ViewCount = 0,
                CategoryId = toysId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            new Product
            {
                Name = "Classic Chess Board Set",
                SKU = "CHESS-WD-PRO",
                Slug = "classic-chess-board-set",
                Description = "Premium wooden chess set with hand-carved pieces and folding board",
                Price = 54.99m,
                BasePrice = 54.99m,
                StockQuantity = 60,
                ViewCount = 0,
                CategoryId = toysId,
                VendorId = superAdmin.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            }
        };

        // Get existing product SKUs from database
        var existingProductSkus = await context.Products
            .Select(p => p.SKU)
            .ToListAsync();

        // Only add products that don't exist yet (check by SKU)
        var newProducts = products
            .Where(p => !existingProductSkus.Contains(p.SKU))
            .ToList();

        if (newProducts.Any())
        {
            await context.Products.AddRangeAsync(newProducts);
            await context.SaveChangesAsync();
        }
    }
}
