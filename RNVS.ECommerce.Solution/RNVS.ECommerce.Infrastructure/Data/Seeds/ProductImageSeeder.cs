using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class ProductImageSeeder
{
    public static async Task SeedAsync(VendorDbContext context)
    {
        // Check if any product images already exist
        if (await context.ProductImages.AnyAsync())
        {
            return; // Product images already seeded
        }

        // Get all products
        var products = await context.Products.ToListAsync();

        if (!products.Any())
        {
            return; // No products to add images for
        }

        var productImages = new List<ProductImage>();

        foreach (var product in products)
        {
            // Add 2-3 images per product
            productImages.Add(new ProductImage
            {
                ProductId = product.Id,
                ImagePath = $"/images/products/{product.Slug}-1.jpg",
                AltText = $"{product.Name} - Main Image",
                DisplayOrder = 1,
                CreatedAt = DateTime.UtcNow
            });

            productImages.Add(new ProductImage
            {
                ProductId = product.Id,
                ImagePath = $"/images/products/{product.Slug}-2.jpg",
                AltText = $"{product.Name} - Detail View",
                DisplayOrder = 2,
                CreatedAt = DateTime.UtcNow
            });

            productImages.Add(new ProductImage
            {
                ProductId = product.Id,
                ImagePath = $"/images/products/{product.Slug}-3.jpg",
                AltText = $"{product.Name} - Alternate Angle",
                DisplayOrder = 3,
                CreatedAt = DateTime.UtcNow
            });
        }

        await context.ProductImages.AddRangeAsync(productImages);
        await context.SaveChangesAsync();
    }
}
