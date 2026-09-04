using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Order;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class AddressSeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Get the first customer user
        var customer = new { Id = adminUserId };

        if (customer == null)
        {
            return; // No users to assign addresses to
        }

        // Check if addresses already exist for this user
        if (await context.Addresses.AnyAsync(a => a.UserId == customer.Id))
        {
            return; // Addresses already seeded
        }

        var addresses = new List<Address>
        {
            new Address
            {
                FirstName = "Admin",
                LastName = "User",
                Street = "123 Main Street, Apt 4B",
                City = "Mumbai",
                State = "Maharashtra",
                PostalCode = "400001",
                Country = "India",
                UserId = customer.Id,
                IsDefault = true,
                Type = AddressType.Both
            },
            new Address
            {
                FirstName = "Admin",
                LastName = "User",
                Street = "456 Business Park, Floor 2",
                City = "Bangalore",
                State = "Karnataka",
                PostalCode = "560001",
                Country = "India",
                UserId = customer.Id,
                IsDefault = false,
                Type = AddressType.Shipping
            }
        };

        await context.Addresses.AddRangeAsync(addresses);
        await context.SaveChangesAsync();
    }
}
