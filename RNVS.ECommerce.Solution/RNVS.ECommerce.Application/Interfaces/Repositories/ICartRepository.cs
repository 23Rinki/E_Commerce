using RNVS.ECommerce.Domain.Entities.Shopping;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface ICartRepository : IBaseRepository<Cart>
{
    Task<Cart?> GetByUserIdAsync(string userId);
    Task<Cart?> GetCartWithItemsAsync(string userId);
}