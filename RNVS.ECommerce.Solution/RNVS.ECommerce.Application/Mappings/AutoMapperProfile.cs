using AutoMapper;
using RNVS.ECommerce.Application.DTOs.User;
using RNVS.ECommerce.Application.DTOs.Product;
using RNVS.ECommerce.Application.DTOs.Shopping;
using RNVS.ECommerce.Application.DTOs.Order;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Domain.Entities.Shopping;
using RNVS.ECommerce.Domain.Entities.Order;

namespace RNVS.ECommerce.Application.Mappings;

public class AutoMapperProfile : Profile
{
    public AutoMapperProfile()
    {
        // User mappings
        CreateMap<ApplicationUser, UserProfileDto>();
        CreateMap<CompanyProfile, CompanyProfileDto>();

        // Product mappings
        CreateMap<Product, ProductDto>();
        CreateMap<ProductCreateDto, Product>();
        CreateMap<ProductUpdateDto, Product>();

        // Cart mappings
        CreateMap<Cart, CartDto>();
        CreateMap<CartItem, CartItemDto>();

        // Order mappings
        CreateMap<Order, OrderDto>();
        CreateMap<OrderItem, OrderItemDto>();
        CreateMap<Address, AddressDto>();
    }
}