namespace RNVS.ECommerce.Application.DTOs.Payment;

public class PaymentDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public decimal Amount { get; set; }
    public int Method { get; set; }
    public int Status { get; set; }
    public string? TransactionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}
