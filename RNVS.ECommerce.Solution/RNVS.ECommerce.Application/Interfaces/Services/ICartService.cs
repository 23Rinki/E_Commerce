using RNVS.ECommerce.Application.DTOs.Shopping;

namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface ICartService
{
    Task<CartDto?> GetCartAsync(string userId);
    Task<bool> AddToCartAsync(string userId, AddToCartDto dto);
    Task<bool> UpdateCartItemAsync(string userId, int cartItemId, int quantity);
    Task<bool> RemoveFromCartAsync(string userId, int cartItemId);
    Task<bool> ClearCartAsync(string userId);
}