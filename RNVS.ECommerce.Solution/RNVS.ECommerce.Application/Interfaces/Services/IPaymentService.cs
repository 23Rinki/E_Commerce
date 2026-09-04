using RNVS.ECommerce.Application.DTOs.Payment;

namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IPaymentService
{
    Task<PaymentResponseDto> ProcessPaymentAsync(PaymentRequestDto request);
    Task<bool> RefundPaymentAsync(int paymentId);
    Task<bool> VerifyPaymentAsync(string transactionId);
}