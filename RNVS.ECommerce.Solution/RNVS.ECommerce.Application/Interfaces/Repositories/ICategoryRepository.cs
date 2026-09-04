using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface ICategoryRepository : IBaseRepository<Category>
{
    Task<IEnumerable<Category>> GetActiveCategoriesAsync();
    Task<Category?> GetByNameAsync(string name);
}
