using RNVS.ECommerce.Application.DTOs.Order;

namespace RNVS.ECommerce.Application.Commands.Orders;

public class CreateOrderCommand
{
    public string UserId { get; set; } = string.Empty;
    public OrderCreateDto OrderData { get; set; } = null!;
}