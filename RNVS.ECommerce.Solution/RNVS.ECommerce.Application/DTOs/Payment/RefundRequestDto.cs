using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Payment;

public class RefundRequestDto
{
    [Required]
    public int PaymentId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [StringLength(500)]
    public string? Reason { get; set; }
}