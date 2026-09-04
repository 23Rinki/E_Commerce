using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class ProductRepository : VendorBaseRepository<Product>, IProductRepository
{
    public ProductRepository(VendorDbContext context) : base(context) { }

    public async Task<IEnumerable<Product>> GetByCategoryAsync(int categoryId)
        => await _dbSet.Where(p => p.CategoryId == categoryId && p.IsActive).ToListAsync();

    public async Task<IEnumerable<Product>> GetByVendorAsync(string vendorId)
        => await _dbSet.Where(p => p.VendorId == vendorId).ToListAsync();

    public async Task<IEnumerable<Product>> SearchAsync(string searchTerm)
        => await _dbSet
            .Where(p => p.IsActive && (p.Name.Contains(searchTerm) || p.Description!.Contains(searchTerm)))
            .ToListAsync();
}
