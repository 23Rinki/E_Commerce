namespace RNVS.ECommerce.Application.DTOs.Payment;

public class PaymentResponseDto
{
    public bool Success { get; set; }
    public string? TransactionId { get; set; }
    public string? Message { get; set; }
    public int PaymentStatus { get; set; }
}