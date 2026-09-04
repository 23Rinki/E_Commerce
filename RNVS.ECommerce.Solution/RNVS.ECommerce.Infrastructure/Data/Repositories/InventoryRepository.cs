using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Inventory;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class InventoryRepository : VendorBaseRepository<Stock>, IInventoryRepository
{
    public InventoryRepository(VendorDbContext context) : base(context) { }

    public async Task<Stock?> GetByProductIdAsync(int productId)
        => await _dbSet.FirstOrDefaultAsync(s => s.ProductId == productId);

    public async Task<IEnumerable<Stock>> GetLowStockProductsAsync()
        => await _dbSet.Where(s => s.CurrentQuantity <= s.MinimumThreshold).ToListAsync();
}
