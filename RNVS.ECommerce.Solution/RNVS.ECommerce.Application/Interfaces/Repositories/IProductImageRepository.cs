using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface IProductImageRepository : IBaseRepository<ProductImage>
{
    Task<IEnumerable<ProductImage>> GetByProductIdAsync(int productId);
    Task<Dictionary<int, string>> GetPrimaryImageUrlsAsync(IEnumerable<int> productIds);
    Task DeleteByProductIdAsync(int productId);
}
