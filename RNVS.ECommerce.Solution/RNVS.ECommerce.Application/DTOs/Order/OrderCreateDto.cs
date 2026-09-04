using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Order;

public class OrderCreateDto
{
    [Required]
    public int ShippingAddressId { get; set; }

    [Required]
    public int PaymentMethodId { get; set; }

    [StringLength(15)]
    public string? CustomerGSTIN { get; set; }
}