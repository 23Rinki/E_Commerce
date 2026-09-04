using RNVS.ECommerce.Application.DTOs.Order;

namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IOrderService
{
    Task<IEnumerable<OrderDto>> GetUserOrdersAsync(string userId);
    Task<OrderDto?> GetOrderByIdAsync(int orderId);
    Task<bool> UpdateOrderStatusAsync(int orderId, int status);
    Task<bool> CancelOrderAsync(int orderId);
}