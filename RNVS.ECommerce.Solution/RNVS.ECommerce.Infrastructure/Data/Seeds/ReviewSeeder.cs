using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class ReviewSeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Check if any reviews already exist
        if (await context.Reviews.AnyAsync())
        {
            return; // Reviews already seeded
        }

        // Get a customer user
        var customer = new { Id = adminUserId };

        if (customer == null)
        {
            return; // No user to create reviews
        }

        // Get some products to review
        var products = await context.Products.Take(6).ToListAsync();

        if (!products.Any())
        {
            return; // No products to review
        }

        var reviews = new List<Review>();

        // Add varied reviews for different products
        if (products.Count > 0)
        {
            reviews.Add(new Review
            {
                ProductId = products[0].Id,
                UserId = customer.Id,
                Rating = 5,
                Comment = "Excellent product! Exactly as described. Very happy with my purchase. Delivery was fast and packaging was perfect.",
                IsApproved = true,
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            });
        }

        if (products.Count > 1)
        {
            reviews.Add(new Review
            {
                ProductId = products[1].Id,
                UserId = customer.Id,
                Rating = 4,
                Comment = "Good quality product. Works as expected. Only minor issue was the delivery took a bit longer than expected.",
                IsApproved = true,
                CreatedAt = DateTime.UtcNow.AddDays(-8)
            });
        }

        if (products.Count > 2)
        {
            reviews.Add(new Review
            {
                ProductId = products[2].Id,
                UserId = customer.Id,
                Rating = 5,
                Comment = "Amazing! Would definitely recommend to friends and family. Best purchase I've made this year.",
                IsApproved = true,
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            });
        }

        if (products.Count > 3)
        {
            reviews.Add(new Review
            {
                ProductId = products[3].Id,
                UserId = customer.Id,
                Rating = 3,
                Comment = "It's okay. Does the job but nothing special. Price is reasonable for what you get.",
                IsApproved = true,
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            });
        }

        if (products.Count > 4)
        {
            reviews.Add(new Review
            {
                ProductId = products[4].Id,
                UserId = customer.Id,
                Rating = 5,
                Comment = "Outstanding quality! Exceeded my expectations. The seller was very responsive and helpful.",
                IsApproved = true,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            });
        }

        if (products.Count > 5)
        {
            reviews.Add(new Review
            {
                ProductId = products[5].Id,
                UserId = customer.Id,
                Rating = 4,
                Comment = "Very satisfied with this product. Great value for money. Will buy again.",
                IsApproved = false, // This one pending approval
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            });
        }

        if (reviews.Any())
        {
            await context.Reviews.AddRangeAsync(reviews);
            await context.SaveChangesAsync();
        }
    }
}
