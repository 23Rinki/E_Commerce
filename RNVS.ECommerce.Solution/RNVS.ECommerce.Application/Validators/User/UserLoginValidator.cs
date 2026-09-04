using FluentValidation;
using RNVS.ECommerce.Application.DTOs.User;

namespace RNVS.ECommerce.Application.Validators.User;

public class UserLoginValidator : AbstractValidator<UserLoginDto>
{
    public UserLoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}