using RNVS.ECommerce.Domain.Entities.Inventory;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface IInventoryRepository : IBaseRepository<Stock>
{
    Task<Stock?> GetByProductIdAsync(int productId);
    Task<IEnumerable<Stock>> GetLowStockProductsAsync();
}