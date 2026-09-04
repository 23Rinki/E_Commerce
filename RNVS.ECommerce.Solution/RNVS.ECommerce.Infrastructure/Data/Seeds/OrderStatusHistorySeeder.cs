using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Order;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class OrderStatusHistorySeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Check if any status histories already exist
        if (await context.OrderStatusHistories.AnyAsync())
        {
            return; // Status histories already seeded
        }

        // Get all orders
        var orders = await context.Orders.ToListAsync();

        if (!orders.Any())
        {
            return; // No orders to create histories for
        }

        var admin = new { Id = adminUserId };

        var statusHistories = new List<OrderStatusHistory>();

        foreach (var order in orders)
        {
            var baseTime = order.CreatedAt;

            // All orders start as Pending
            statusHistories.Add(new OrderStatusHistory
            {
                OrderId = order.Id,
                PreviousStatus = OrderStatus.Pending,
                NewStatus = OrderStatus.Pending,
                UpdatedBy = admin?.Id,
                Comment = "Order placed successfully",
                CreatedAt = baseTime
            });

            // Add status progression based on current order status
            if (order.Status >= OrderStatus.Processing)
            {
                statusHistories.Add(new OrderStatusHistory
                {
                    OrderId = order.Id,
                    PreviousStatus = OrderStatus.Pending,
                    NewStatus = OrderStatus.Processing,
                    UpdatedBy = admin?.Id,
                    Comment = "Order is being processed",
                    CreatedAt = baseTime.AddHours(2)
                });
            }

            if (order.Status >= OrderStatus.Shipped)
            {
                statusHistories.Add(new OrderStatusHistory
                {
                    OrderId = order.Id,
                    PreviousStatus = OrderStatus.Processing,
                    NewStatus = OrderStatus.Shipped,
                    UpdatedBy = admin?.Id,
                    Comment = "Order has been shipped. Tracking number: TRACK123456",
                    CreatedAt = baseTime.AddDays(1)
                });
            }

            if (order.Status == OrderStatus.Delivered)
            {
                statusHistories.Add(new OrderStatusHistory
                {
                    OrderId = order.Id,
                    PreviousStatus = OrderStatus.Shipped,
                    NewStatus = OrderStatus.Delivered,
                    UpdatedBy = admin?.Id,
                    Comment = "Order delivered successfully",
                    CreatedAt = baseTime.AddDays(3)
                });
            }

            if (order.Status == OrderStatus.Cancelled)
            {
                statusHistories.Add(new OrderStatusHistory
                {
                    OrderId = order.Id,
                    PreviousStatus = OrderStatus.Pending,
                    NewStatus = OrderStatus.Cancelled,
                    UpdatedBy = admin?.Id,
                    Comment = "Order cancelled by customer request",
                    CreatedAt = baseTime.AddHours(1)
                });
            }
        }

        if (statusHistories.Any())
        {
            await context.OrderStatusHistories.AddRangeAsync(statusHistories);
            await context.SaveChangesAsync();
        }
    }
}
