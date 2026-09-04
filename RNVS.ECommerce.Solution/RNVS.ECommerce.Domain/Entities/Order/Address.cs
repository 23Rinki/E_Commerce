using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Order;

public class Address
{
    public int Id { get; set; }

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

    public string UserId { get; set; } = string.Empty;

    public string? VendorId { get; set; }

    public bool IsDefault { get; set; } = false;

    public AddressType Type { get; set; } = AddressType.Shipping;
}