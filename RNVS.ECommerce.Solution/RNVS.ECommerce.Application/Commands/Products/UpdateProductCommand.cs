using RNVS.ECommerce.Application.DTOs.Product;

namespace RNVS.ECommerce.Application.Commands.Products;

public class UpdateProductCommand
{
    public int ProductId { get; set; }
    public ProductUpdateDto ProductData { get; set; } = null!;
}