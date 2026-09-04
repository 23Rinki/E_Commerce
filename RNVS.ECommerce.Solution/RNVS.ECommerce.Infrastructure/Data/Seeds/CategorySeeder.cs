using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class CategorySeeder
{
    public static async Task SeedAsync(VendorDbContext context)
    {
        // Define the categories to seed
        var categoriesToSeed = new List<Category>
        {
            new Category
            {
                Name = "Electronics",
                Description = "Electronic devices, gadgets, and accessories",
                IsActive = true
            },
            new Category
            {
                Name = "Clothing",
                Description = "Men's and women's fashion apparel",
                IsActive = true
            },
            new Category
            {
                Name = "Home & Kitchen",
                Description = "Home appliances, kitchenware, and decor",
                IsActive = true
            },
            new Category
            {
                Name = "Books",
                Description = "Fiction, non-fiction, textbooks, and e-books",
                IsActive = true
            },
            new Category
            {
                Name = "Sports & Outdoors",
                Description = "Sports equipment, outdoor gear, and fitness accessories",
                IsActive = true
            },
            new Category
            {
                Name = "Toys & Games",
                Description = "Children's toys, board games, and gaming accessories",
                IsActive = true
            }
        };

        // Get existing category names from database
        var existingCategoryNames = await context.Categories
            .Select(c => c.Name)
            .ToListAsync();

        // Only add categories that don't exist yet
        var newCategories = categoriesToSeed
            .Where(c => !existingCategoryNames.Contains(c.Name))
            .ToList();

        if (newCategories.Any())
        {
            await context.Categories.AddRangeAsync(newCategories);
            await context.SaveChangesAsync();
        }
    }
}
