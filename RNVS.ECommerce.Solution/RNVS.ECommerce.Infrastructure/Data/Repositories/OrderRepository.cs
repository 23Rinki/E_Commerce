using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Order;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class OrderRepository : VendorBaseRepository<Order>, IOrderRepository
{
    public OrderRepository(VendorDbContext context) : base(context) { }

    public async Task<IEnumerable<Order>> GetByUserIdAsync(string userId)
        => await _dbSet.Where(o => o.UserId == userId).OrderByDescending(o => o.CreatedAt).ToListAsync();

    public async Task<Order?> GetByOrderNumberAsync(string orderNumber)
        => await _dbSet.FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);

    public async Task<IEnumerable<Order>> GetByStatusAsync(int status)
        => await _dbSet.Where(o => (int)o.Status == status).ToListAsync();
}
