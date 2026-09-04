using RNVS.ECommerce.Application.DTOs.User;

namespace RNVS.ECommerce.Application.Commands.Users;

public class UpdateUserCommand
{
    public string UserId { get; set; } = string.Empty;
    public UserUpdateDto UserData { get; set; } = null!;
}