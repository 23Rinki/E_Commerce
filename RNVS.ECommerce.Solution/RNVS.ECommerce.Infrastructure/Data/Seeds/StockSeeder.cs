using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Inventory;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class StockSeeder
{
    public static async Task SeedAsync(VendorDbContext context)
    {
        // Get all products
        var products = await context.Products.ToListAsync();

        if (!products.Any())
        {
            return; // No products to create stock for
        }

        // Get existing stock records
        var existingStockProductIds = await context.Stocks
            .Select(s => s.ProductId)
            .ToListAsync();

        var stocksToAdd = new List<Stock>();

        foreach (var product in products)
        {
            // Skip if stock already exists for this product
            if (existingStockProductIds.Contains(product.Id))
            {
                continue;
            }

            stocksToAdd.Add(new Stock
            {
                ProductId = product.Id,
                CurrentQuantity = product.StockQuantity,
                ReservedQuantity = 0,
                MinimumThreshold = 10,
                LastUpdated = DateTime.UtcNow
            });
        }

        if (stocksToAdd.Any())
        {
            await context.Stocks.AddRangeAsync(stocksToAdd);
            await context.SaveChangesAsync();
        }
    }
}
