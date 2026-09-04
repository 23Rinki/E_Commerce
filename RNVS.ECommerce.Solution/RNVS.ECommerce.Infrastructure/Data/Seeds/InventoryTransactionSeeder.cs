using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Inventory;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class InventoryTransactionSeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Check if any inventory transactions already exist
        if (await context.InventoryTransactions.AnyAsync())
        {
            return; // Transactions already seeded
        }

        // Get all products
        var products = await context.Products.Take(5).ToListAsync();

        if (!products.Any())
        {
            return; // No products to create transactions for
        }

        var admin = new { Id = adminUserId };

        var transactions = new List<InventoryTransaction>();

        foreach (var product in products)
        {
            // Initial purchase transaction (stock added)
            transactions.Add(new InventoryTransaction
            {
                ProductId = product.Id,
                Quantity = product.StockQuantity,
                Type = InventoryTransactionType.Purchase,
                Notes = "Initial stock purchase",
                ReferenceNumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{product.Id:D4}",
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                CreatedBy = admin.Id
            });

            // Some sales (stock reduced)
            transactions.Add(new InventoryTransaction
            {
                ProductId = product.Id,
                Quantity = -5,
                Type = InventoryTransactionType.Sale,
                Notes = "Sold via order",
                ReferenceNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-0001",
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                CreatedBy = admin.Id
            });

            // Stock adjustment
            transactions.Add(new InventoryTransaction
            {
                ProductId = product.Id,
                Quantity = 10,
                Type = InventoryTransactionType.Adjustment,
                Notes = "Stock count adjustment after inventory audit",
                ReferenceNumber = $"ADJ-{DateTime.UtcNow:yyyyMMdd}-{product.Id}",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                CreatedBy = admin.Id
            });

            // Product return (stock increased)
            transactions.Add(new InventoryTransaction
            {
                ProductId = product.Id,
                Quantity = 2,
                Type = InventoryTransactionType.Return,
                Notes = "Customer return - product unused",
                ReferenceNumber = $"RET-{DateTime.UtcNow:yyyyMMdd}-{product.Id}",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                CreatedBy = admin.Id
            });
        }

        if (transactions.Any())
        {
            await context.InventoryTransactions.AddRangeAsync(transactions);
            await context.SaveChangesAsync();
        }
    }
}
