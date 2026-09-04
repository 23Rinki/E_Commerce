namespace RNVS.ECommerce.Infrastructure.Payment;

public interface IPaymentProcessor
{
    Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request);
    Task<PaymentResult> RefundPaymentAsync(string transactionId, decimal amount);
    Task<PaymentStatus> VerifyPaymentAsync(string transactionId);
    string ProviderName { get; }
}

public class PaymentRequest
{
    public string OrderId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public Dictionary<string, string> Metadata { get; set; } = new();
}

public class PaymentResult
{
    public bool Success { get; set; }
    public string? TransactionId { get; set; }
    public string? Message { get; set; }
    public PaymentStatus Status { get; set; }
    public string? PaymentUrl { get; set; }
}

public enum PaymentStatus
{
    Pending,
    Processing,
    Success,
    Failed,
    Refunded,
    Cancelled
}