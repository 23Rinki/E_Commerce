using AutoMapper;
using RNVS.ECommerce.Application.DTOs.Order;
using RNVS.ECommerce.Domain.Entities.Order;

namespace RNVS.ECommerce.Application.Mappings;

public class OrderMappingProfile : Profile
{
    public OrderMappingProfile()
    {
        CreateMap<Order, OrderDto>();
        CreateMap<Order, OrderSummaryDto>();
        CreateMap<OrderItem, OrderItemDto>();
        CreateMap<Address, AddressDto>().ReverseMap();
    }
}