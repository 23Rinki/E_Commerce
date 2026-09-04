using RNVS.ECommerce.Application.DTOs.Product;

namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IRecommendationService
{
    Task<IEnumerable<ProductDto>> GetRecommendedProductsAsync(string userId);
    Task<IEnumerable<ProductDto>> GetSimilarProductsAsync(int productId);
}