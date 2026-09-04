using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Shopping;

public class CheckoutDto
{
    [Required]
    public int ShippingAddressId { get; set; }

    [Required]
    public int PaymentMethodId { get; set; }

    public string? Notes { get; set; }
}