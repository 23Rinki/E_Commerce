using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class ProductImageRepository : VendorBaseRepository<ProductImage>, IProductImageRepository
{
    public ProductImageRepository(VendorDbContext context) : base(context) { }

    public async Task<IEnumerable<ProductImage>> GetByProductIdAsync(int productId)
        => await _dbSet.Where(pi => pi.ProductId == productId).OrderBy(pi => pi.DisplayOrder).ToListAsync();

    public async Task<Dictionary<int, string>> GetPrimaryImageUrlsAsync(IEnumerable<int> productIds)
    {
        var ids = productIds.ToList();
        return await _dbSet
            .Where(pi => ids.Contains(pi.ProductId))
            .GroupBy(pi => pi.ProductId)
            .Select(g => g.OrderBy(pi => pi.DisplayOrder).First())
            .ToDictionaryAsync(pi => pi.ProductId, pi => pi.ImagePath);
    }

    public async Task DeleteByProductIdAsync(int productId)
    {
        var images = await _dbSet.Where(pi => pi.ProductId == productId).ToListAsync();
        _dbSet.RemoveRange(images);
        await _context.SaveChangesAsync();
    }
}
