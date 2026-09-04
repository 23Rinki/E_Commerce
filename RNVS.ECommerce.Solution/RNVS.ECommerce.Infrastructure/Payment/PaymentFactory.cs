using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Payment;

public class PaymentFactory
{
    private readonly IEnumerable<IPaymentProcessor> _paymentProcessors;

    public PaymentFactory(IEnumerable<IPaymentProcessor> paymentProcessors)
    {
        _paymentProcessors = paymentProcessors;
    }

    public IPaymentProcessor GetPaymentProcessor(PaymentMethod method)
    {
        return method switch
        {
            PaymentMethod.Stripe => _paymentProcessors.First(p => p.ProviderName == "Stripe"),
            PaymentMethod.PayPal => _paymentProcessors.First(p => p.ProviderName == "PayPal"),
            _ => throw new NotSupportedException($"Payment method {method} is not supported")
        };
    }
}