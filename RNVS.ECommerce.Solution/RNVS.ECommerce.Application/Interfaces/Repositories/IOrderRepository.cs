using RNVS.ECommerce.Domain.Entities.Order;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface IOrderRepository : IBaseRepository<Order>
{
    Task<IEnumerable<Order>> GetByUserIdAsync(string userId);
    Task<Order?> GetByOrderNumberAsync(string orderNumber);
    Task<IEnumerable<Order>> GetByStatusAsync(int status);
}