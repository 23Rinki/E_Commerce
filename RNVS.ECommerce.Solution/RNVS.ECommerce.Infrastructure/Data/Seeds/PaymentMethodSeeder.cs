using Microsoft.EntityFrameworkCore;
using PaymentMethodEntity = RNVS.ECommerce.Domain.Entities.Payment.PaymentMethod;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class PaymentMethodSeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Get a customer user
        var customer = new { Id = adminUserId };

        if (customer == null)
        {
            return; // No user to create payment methods for
        }

        // Check if payment methods already exist for this user
        if (await context.PaymentMethods.AnyAsync(pm => pm.UserId == customer.Id))
        {
            return; // Payment methods already exist
        }

        var paymentMethods = new List<PaymentMethodEntity>
        {
            new PaymentMethodEntity
            {
                UserId = customer.Id,
                Type = "CreditCard",
                LastFourDigits = "4242",
                BrandName = "Visa",
                IsDefault = true,
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new PaymentMethodEntity
            {
                UserId = customer.Id,
                Type = "DebitCard",
                LastFourDigits = "1234",
                BrandName = "MasterCard",
                IsDefault = false,
                CreatedAt = DateTime.UtcNow.AddDays(-15)
            },
            new PaymentMethodEntity
            {
                UserId = customer.Id,
                Type = "PayPal",
                LastFourDigits = null,
                BrandName = "PayPal",
                IsDefault = false,
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            }
        };

        await context.PaymentMethods.AddRangeAsync(paymentMethods);
        await context.SaveChangesAsync();
    }
}
