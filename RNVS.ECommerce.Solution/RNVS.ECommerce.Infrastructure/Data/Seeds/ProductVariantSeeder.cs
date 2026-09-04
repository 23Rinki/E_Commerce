using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class ProductVariantSeeder
{
    public static async Task SeedAsync(VendorDbContext context)
    {
        // Check if any variants already exist
        if (await context.ProductVariants.AnyAsync())
        {
            return; // Variants already seeded
        }

        // Get specific products that should have variants
        var products = await context.Products.ToListAsync();

        if (!products.Any())
        {
            return; // No products to add variants for
        }

        var variants = new List<ProductVariant>();

        // Add variants for clothing items
        var shirt = products.FirstOrDefault(p => p.Name.Contains("Shirt"));
        if (shirt != null)
        {
            variants.AddRange(new[]
            {
                new ProductVariant
                {
                    ProductId = shirt.Id,
                    SKU = $"{shirt.SKU}-S",
                    Name = "Small - Blue",
                    Price = shirt.Price,
                    CompareAtPrice = null,
                    StockQuantity = 50,
                    Attributes = "{\"size\":\"S\",\"color\":\"Blue\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new ProductVariant
                {
                    ProductId = shirt.Id,
                    SKU = $"{shirt.SKU}-M",
                    Name = "Medium - Blue",
                    Price = shirt.Price,
                    CompareAtPrice = null,
                    StockQuantity = 80,
                    Attributes = "{\"size\":\"M\",\"color\":\"Blue\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new ProductVariant
                {
                    ProductId = shirt.Id,
                    SKU = $"{shirt.SKU}-L",
                    Name = "Large - Blue",
                    Price = shirt.Price,
                    CompareAtPrice = null,
                    StockQuantity = 70,
                    Attributes = "{\"size\":\"L\",\"color\":\"Blue\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            });
        }

        var jeans = products.FirstOrDefault(p => p.Name.Contains("Jeans"));
        if (jeans != null)
        {
            variants.AddRange(new[]
            {
                new ProductVariant
                {
                    ProductId = jeans.Id,
                    SKU = $"{jeans.SKU}-26",
                    Name = "Size 26 - Black",
                    Price = jeans.Price,
                    CompareAtPrice = jeans.BasePrice,
                    StockQuantity = 30,
                    Attributes = "{\"size\":\"26\",\"color\":\"Black\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new ProductVariant
                {
                    ProductId = jeans.Id,
                    SKU = $"{jeans.SKU}-28",
                    Name = "Size 28 - Black",
                    Price = jeans.Price,
                    CompareAtPrice = jeans.BasePrice,
                    StockQuantity = 45,
                    Attributes = "{\"size\":\"28\",\"color\":\"Black\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new ProductVariant
                {
                    ProductId = jeans.Id,
                    SKU = $"{jeans.SKU}-30",
                    Name = "Size 30 - Black",
                    Price = jeans.Price,
                    CompareAtPrice = jeans.BasePrice,
                    StockQuantity = 45,
                    Attributes = "{\"size\":\"30\",\"color\":\"Black\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            });
        }

        // Add variants for electronics (storage options)
        var iphone = products.FirstOrDefault(p => p.Name.Contains("iPhone"));
        if (iphone != null)
        {
            variants.AddRange(new[]
            {
                new ProductVariant
                {
                    ProductId = iphone.Id,
                    SKU = "IPH15P-128-BLK",
                    Name = "128GB - Black Titanium",
                    Price = 999.99m,
                    CompareAtPrice = null,
                    StockQuantity = 20,
                    Attributes = "{\"storage\":\"128GB\",\"color\":\"Black Titanium\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new ProductVariant
                {
                    ProductId = iphone.Id,
                    SKU = "IPH15P-256-BLK",
                    Name = "256GB - Black Titanium",
                    Price = 1199.99m,
                    CompareAtPrice = null,
                    StockQuantity = 30,
                    Attributes = "{\"storage\":\"256GB\",\"color\":\"Black Titanium\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new ProductVariant
                {
                    ProductId = iphone.Id,
                    SKU = "IPH15P-512-WHT",
                    Name = "512GB - White Titanium",
                    Price = 1399.99m,
                    CompareAtPrice = null,
                    StockQuantity = 15,
                    Attributes = "{\"storage\":\"512GB\",\"color\":\"White Titanium\"}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            });
        }

        if (variants.Any())
        {
            await context.ProductVariants.AddRangeAsync(variants);
            await context.SaveChangesAsync();
        }
    }
}
