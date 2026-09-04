using FluentValidation;
using RNVS.ECommerce.Application.DTOs.Payment;

namespace RNVS.ECommerce.Application.Validators.Payment;

public class PaymentValidator : AbstractValidator<PaymentRequestDto>
{
    public PaymentValidator()
    {
        RuleFor(x => x.OrderId).GreaterThan(0);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.PaymentMethod).GreaterThan(0);
    }
}