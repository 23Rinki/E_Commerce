using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Shopping;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class CartRepository : VendorBaseRepository<Cart>, ICartRepository
{
    public CartRepository(VendorDbContext context) : base(context) { }

    public async Task<Cart?> GetByUserIdAsync(string userId)
        => await _dbSet.FirstOrDefaultAsync(c => c.UserId == userId);

    public async Task<Cart?> GetCartWithItemsAsync(string userId)
        => await _dbSet
            .Include(c => c.CartItems)
                .ThenInclude(ci => ci.Product)
                    .ThenInclude(p => p.ProductImages)
            .FirstOrDefaultAsync(c => c.UserId == userId);
}
