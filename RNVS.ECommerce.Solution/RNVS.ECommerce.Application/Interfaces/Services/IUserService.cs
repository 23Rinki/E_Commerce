using RNVS.ECommerce.Application.DTOs.User;

namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IUserService
{
    Task<bool> RegisterUserAsync(UserRegistrationDto dto);
    Task<bool> LoginUserAsync(UserLoginDto dto);
    Task<UserProfileDto?> GetUserProfileAsync(string userId);
    Task<bool> UpdateUserProfileAsync(string userId, UserUpdateDto dto);
}