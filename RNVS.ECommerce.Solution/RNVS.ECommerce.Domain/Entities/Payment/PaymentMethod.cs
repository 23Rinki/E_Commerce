using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Payment;

public class PaymentMethod
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string? VendorId { get; set; }

    [Required]
    [StringLength(50)]
    public string Type { get; set; } = string.Empty; // CreditCard, PayPal, etc.

    [StringLength(4)]
    public string? LastFourDigits { get; set; }

    [StringLength(50)]
    public string? BrandName { get; set; } // Visa, MasterCard, etc.

    public bool IsDefault { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}