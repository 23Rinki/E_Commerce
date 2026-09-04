using FluentValidation;
using RNVS.ECommerce.Application.DTOs.Shopping;

namespace RNVS.ECommerce.Application.Validators.Order;

public class CheckoutValidator : AbstractValidator<CheckoutDto>
{
    public CheckoutValidator()
    {
        RuleFor(x => x.ShippingAddressId).GreaterThan(0);
        RuleFor(x => x.PaymentMethodId).GreaterThan(0);
    }
}