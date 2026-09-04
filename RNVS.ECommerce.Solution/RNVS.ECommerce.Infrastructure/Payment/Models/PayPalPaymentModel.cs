namespace RNVS.ECommerce.Infrastructure.Payment.Models;

public class PayPalPaymentModel
{
    public string OrderId { get; set; } = string.Empty;
    public string PayerId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class PayPalCapture
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public PayPalAmount Amount { get; set; } = new();
}

public class PayPalAmount
{
    public string CurrencyCode { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}