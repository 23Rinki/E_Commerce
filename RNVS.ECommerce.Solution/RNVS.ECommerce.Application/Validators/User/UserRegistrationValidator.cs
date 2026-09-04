using FluentValidation;
using RNVS.ECommerce.Application.DTOs.User;

namespace RNVS.ECommerce.Application.Validators.User;

public class UserRegistrationValidator : AbstractValidator<UserRegistrationDto>
{
    public UserRegistrationValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6).MaximumLength(100);
        RuleFor(x => x.ConfirmPassword).Equal(x => x.Password);
    }
}