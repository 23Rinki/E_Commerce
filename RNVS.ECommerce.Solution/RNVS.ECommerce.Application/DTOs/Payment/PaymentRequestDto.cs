using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Payment;

public class PaymentRequestDto
{
    [Required]
    public int OrderId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public int PaymentMethod { get; set; }
}