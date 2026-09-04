using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Entities.Order;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Seeds;

public static class OrderSeeder
{
    public static async Task SeedAsync(VendorDbContext context, string adminUserId)
    {
        // Check if any orders already exist
        if (await context.Orders.AnyAsync())
        {
            return; // Orders already seeded
        }

        // Get a customer user
        var customer = new { Id = adminUserId };

        if (customer == null)
        {
            return; // No user to create orders for
        }

        // Get some products
        var products = await context.Products.Take(8).ToListAsync();

        if (!products.Any())
        {
            return; // No products to create orders for
        }

        var orders = new List<Order>();
        var orderItems = new List<OrderItem>();

        // Order 1: Completed order (3 items)
        var order1 = new Order
        {
            OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-0001",
            UserId = customer.Id,
            SubTotal = 0,
            TaxAmount = 0,
            ShippingCost = 50.00m,
            TotalAmount = 0,
            Status = OrderStatus.Delivered,
            CreatedAt = DateTime.UtcNow.AddDays(-20)
        };

        if (products.Count > 0)
        {
            var item1 = new OrderItem
            {
                ProductId = products[0].Id,
                ProductName = products[0].Name,
                Quantity = 1,
                UnitPrice = products[0].Price,
                TotalPrice = products[0].Price
            };
            order1.SubTotal += item1.TotalPrice;
            orderItems.Add(item1);
        }

        if (products.Count > 1)
        {
            var item2 = new OrderItem
            {
                ProductId = products[1].Id,
                ProductName = products[1].Name,
                Quantity = 2,
                UnitPrice = products[1].Price,
                TotalPrice = products[1].Price * 2
            };
            order1.SubTotal += item2.TotalPrice;
            orderItems.Add(item2);
        }

        if (products.Count > 2)
        {
            var item3 = new OrderItem
            {
                ProductId = products[2].Id,
                ProductName = products[2].Name,
                Quantity = 1,
                UnitPrice = products[2].Price,
                TotalPrice = products[2].Price
            };
            order1.SubTotal += item3.TotalPrice;
            orderItems.Add(item3);
        }

        order1.TaxAmount = order1.SubTotal * 0.18m; // 18% tax
        order1.TotalAmount = order1.SubTotal + order1.TaxAmount + order1.ShippingCost;
        orders.Add(order1);

        // Order 2: Shipped order (2 items)
        var order2 = new Order
        {
            OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-0002",
            UserId = customer.Id,
            SubTotal = 0,
            TaxAmount = 0,
            ShippingCost = 50.00m,
            TotalAmount = 0,
            Status = OrderStatus.Shipped,
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        };

        if (products.Count > 3)
        {
            var item4 = new OrderItem
            {
                ProductId = products[3].Id,
                ProductName = products[3].Name,
                Quantity = 3,
                UnitPrice = products[3].Price,
                TotalPrice = products[3].Price * 3
            };
            order2.SubTotal += item4.TotalPrice;
            orderItems.Add(item4);
        }

        if (products.Count > 4)
        {
            var item5 = new OrderItem
            {
                ProductId = products[4].Id,
                ProductName = products[4].Name,
                Quantity = 1,
                UnitPrice = products[4].Price,
                TotalPrice = products[4].Price
            };
            order2.SubTotal += item5.TotalPrice;
            orderItems.Add(item5);
        }

        order2.TaxAmount = order2.SubTotal * 0.18m;
        order2.TotalAmount = order2.SubTotal + order2.TaxAmount + order2.ShippingCost;
        orders.Add(order2);

        // Order 3: Processing order (1 item)
        var order3 = new Order
        {
            OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-0003",
            UserId = customer.Id,
            SubTotal = 0,
            TaxAmount = 0,
            ShippingCost = 50.00m,
            TotalAmount = 0,
            Status = OrderStatus.Processing,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        if (products.Count > 5)
        {
            var item6 = new OrderItem
            {
                ProductId = products[5].Id,
                ProductName = products[5].Name,
                Quantity = 2,
                UnitPrice = products[5].Price,
                TotalPrice = products[5].Price * 2
            };
            order3.SubTotal += item6.TotalPrice;
            orderItems.Add(item6);
        }

        order3.TaxAmount = order3.SubTotal * 0.18m;
        order3.TotalAmount = order3.SubTotal + order3.TaxAmount + order3.ShippingCost;
        orders.Add(order3);

        // Order 4: Pending order (2 items)
        var order4 = new Order
        {
            OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-0004",
            UserId = customer.Id,
            SubTotal = 0,
            TaxAmount = 0,
            ShippingCost = 50.00m,
            TotalAmount = 0,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow.AddHours(-6)
        };

        if (products.Count > 6)
        {
            var item7 = new OrderItem
            {
                ProductId = products[6].Id,
                ProductName = products[6].Name,
                Quantity = 1,
                UnitPrice = products[6].Price,
                TotalPrice = products[6].Price
            };
            order4.SubTotal += item7.TotalPrice;
            orderItems.Add(item7);
        }

        if (products.Count > 7)
        {
            var item8 = new OrderItem
            {
                ProductId = products[7].Id,
                ProductName = products[7].Name,
                Quantity = 4,
                UnitPrice = products[7].Price,
                TotalPrice = products[7].Price * 4
            };
            order4.SubTotal += item8.TotalPrice;
            orderItems.Add(item8);
        }

        order4.TaxAmount = order4.SubTotal * 0.18m;
        order4.TotalAmount = order4.SubTotal + order4.TaxAmount + order4.ShippingCost;
        orders.Add(order4);

        // Save orders first
        await context.Orders.AddRangeAsync(orders);
        await context.SaveChangesAsync();

        // Now link order items to orders
        int itemIndex = 0;
        foreach (var order in orders)
        {
            int itemsPerOrder = order.OrderNumber.EndsWith("0001") ? 3 :
                               order.OrderNumber.EndsWith("0002") ? 2 :
                               order.OrderNumber.EndsWith("0003") ? 1 : 2;

            for (int i = 0; i < itemsPerOrder && itemIndex < orderItems.Count; i++)
            {
                orderItems[itemIndex].OrderId = order.Id;
                itemIndex++;
            }
        }

        await context.OrderItems.AddRangeAsync(orderItems);
        await context.SaveChangesAsync();
    }
}
