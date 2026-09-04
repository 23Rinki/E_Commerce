using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.PaymentMethod;

public class CreatePaymentMethodDto
{
    [Required]
    [StringLength(50)]
    public string Type { get; set; } = string.Empty;

    [StringLength(4)]
    public string? LastFourDigits { get; set; }

    [StringLength(50)]
    public string? BrandName { get; set; }

    public bool IsDefault { get; set; } = false;
}
