using FluentValidation;
using RNVS.ECommerce.Application.DTOs.Order;

namespace RNVS.ECommerce.Application.Validators.Order;

public class AddressValidator : AbstractValidator<AddressDto>
{
    public AddressValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Street).NotEmpty().MaximumLength(200);
    }
}