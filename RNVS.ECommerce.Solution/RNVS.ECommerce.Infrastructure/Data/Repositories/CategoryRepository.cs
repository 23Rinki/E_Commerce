using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class CategoryRepository : VendorBaseRepository<Category>, ICategoryRepository
{
    public CategoryRepository(VendorDbContext context) : base(context) { }

    public async Task<IEnumerable<Category>> GetActiveCategoriesAsync()
        => await _dbSet.Where(c => c.IsActive).OrderBy(c => c.Name).ToListAsync();

    public async Task<Category?> GetByNameAsync(string name)
        => await _dbSet.FirstOrDefaultAsync(c => c.Name == name);
}
