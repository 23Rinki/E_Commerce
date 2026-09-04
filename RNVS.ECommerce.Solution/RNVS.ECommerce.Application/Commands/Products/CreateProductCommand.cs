using RNVS.ECommerce.Application.DTOs.Product;

namespace RNVS.ECommerce.Application.Commands.Products;

public class CreateProductCommand
{
    public ProductCreateDto ProductData { get; set; } = null!;
}