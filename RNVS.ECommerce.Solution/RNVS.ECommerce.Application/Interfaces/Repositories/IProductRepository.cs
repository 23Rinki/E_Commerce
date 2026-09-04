using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface IProductRepository : IBaseRepository<Product>
{
    Task<IEnumerable<Product>> GetByCategoryAsync(int categoryId);
    Task<IEnumerable<Product>> GetByVendorAsync(string vendorId);
    Task<IEnumerable<Product>> SearchAsync(string searchTerm);
}