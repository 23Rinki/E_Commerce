using RNVS.ECommerce.Application.DTOs.Shopping;
using RNVS.ECommerce.Application.DTOs.Order;

namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface ICheckoutService
{
    Task<OrderDto> ProcessCheckoutAsync(string userId, CheckoutDto dto);
    Task<bool> ValidateCheckoutAsync(string userId, CheckoutDto dto);
}