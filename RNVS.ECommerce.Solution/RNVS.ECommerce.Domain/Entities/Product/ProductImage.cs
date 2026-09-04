using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Product;

public class ProductImage
{
    public int Id { get; set; }

    [Required]
    [StringLength(500)]
    public string ImagePath { get; set; } = string.Empty;

    [StringLength(200)]
    public string? AltText { get; set; }

    public int DisplayOrder { get; set; }

    public int ProductId { get; set; }

    public string? VendorId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}