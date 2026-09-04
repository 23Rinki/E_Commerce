using RNVS.ECommerce.Application.DTOs.Product;

namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IProductService
{
    Task<IEnumerable<ProductDto>> GetAllProductsAsync();
    Task<ProductDto?> GetProductByIdAsync(int id);
    Task<ProductDto> CreateProductAsync(ProductCreateDto dto);
    Task<bool> UpdateProductAsync(int id, ProductUpdateDto dto);
    Task<bool> DeleteProductAsync(int id);
}