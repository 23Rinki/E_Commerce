using AutoMapper;
using RNVS.ECommerce.Application.DTOs.Product;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Application.Mappings;

public class ProductMappingProfile : Profile
{
    public ProductMappingProfile()
    {
        CreateMap<Product, ProductDto>();
        CreateMap<Product, ProductListDto>();
        CreateMap<Product, ProductDetailsDto>();
        CreateMap<ProductCreateDto, Product>();
        CreateMap<ProductUpdateDto, Product>();
    }
}