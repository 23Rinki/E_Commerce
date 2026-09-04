using Microsoft.EntityFrameworkCore;
using PaymentEntity = RNVS.ECommerce.Domain.Entities.Payment.Payment;
using PaymentMethodEnum = RNVS.ECommerce.Domain.Enums.PaymentMethod;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class PaymentSeeder
{
    public static async Task SeedAsync(VendorDbContext context)
    {
        // Check if any payments already exist
        if (await context.Payments.AnyAsync())
        {
            return; // Payments already seeded
        }

        // Get all orders
        var orders = await context.Orders.ToListAsync();

        if (!orders.Any())
        {
            return; // No orders to create payments for
        }

        var payments = new List<PaymentEntity>();

        foreach (var order in orders)
        {
            PaymentStatus paymentStatus;
            PaymentMethodEnum paymentMethod;
            DateTime? processedAt = null;

            // Determine payment status based on order status
            switch (order.Status)
            {
                case OrderStatus.Delivered:
                    paymentStatus = PaymentStatus.Success;
                    paymentMethod = PaymentMethodEnum.CreditCard;
                    processedAt = order.CreatedAt.AddMinutes(5);
                    break;
                case OrderStatus.Shipped:
                    paymentStatus = PaymentStatus.Success;
                    paymentMethod = PaymentMethodEnum.DebitCard;
                    processedAt = order.CreatedAt.AddMinutes(3);
                    break;
                case OrderStatus.Processing:
                    paymentStatus = PaymentStatus.Success;
                    paymentMethod = PaymentMethodEnum.PayPal;
                    processedAt = order.CreatedAt.AddMinutes(10);
                    break;
                case OrderStatus.Pending:
                    paymentStatus = PaymentStatus.Pending;
                    paymentMethod = PaymentMethodEnum.CreditCard;
                    processedAt = null;
                    break;
                default:
                    paymentStatus = PaymentStatus.Pending;
                    paymentMethod = PaymentMethodEnum.CreditCard;
                    break;
            }

            payments.Add(new PaymentEntity
            {
                OrderId = order.Id,
                Amount = order.TotalAmount,
                Method = paymentMethod,
                Status = paymentStatus,
                TransactionId = paymentStatus == PaymentStatus.Success
                    ? $"TXN-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}"
                    : null,
                CreatedAt = order.CreatedAt,
                ProcessedAt = processedAt
            });
        }

        if (payments.Any())
        {
            await context.Payments.AddRangeAsync(payments);
            await context.SaveChangesAsync();
        }
    }
}
