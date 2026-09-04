using RNVS.ECommerce.Application.DTOs.Product;

namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface ISearchService
{
    Task<IEnumerable<ProductDto>> SearchProductsAsync(string query);
    Task<IEnumerable<ProductDto>> FilterProductsAsync(ProductSearchDto filter);
}