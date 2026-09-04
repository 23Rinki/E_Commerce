using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Address;

public class CreateAddressDto
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Street { get; set; } = string.Empty;

    [StringLength(100)]
    public string? City { get; set; }

    [StringLength(50)]
    public string? State { get; set; }

    [StringLength(20)]
    public string? PostalCode { get; set; }

    [StringLength(50)]
    public string? Country { get; set; }

    public bool IsDefault { get; set; } = false;

    public int Type { get; set; } = 1; // 1 = Shipping, 2 = Billing
}
