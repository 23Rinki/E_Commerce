using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Shopping;

public class AddToCartDto
{
    [Required]
    public int ProductId { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    // Which vendor's database this product lives in. Product IDs are only unique
    // within a single vendor's database, not platform-wide, so this is required to
    // resolve the right product when vendors have dedicated databases.
    public string? VendorId { get; set; }
}