using RNVS.ECommerce.Application.DTOs.User;

namespace RNVS.ECommerce.Application.Commands.Users;

public class CreateUserCommand
{
    public UserRegistrationDto UserData { get; set; } = null!;
}