using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RNVS.ECommerce.Domain.Entities.Product;

public class Product
{
    public int Id { get; set; }

    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(100)]
    public string? SKU { get; set; }

    [StringLength(200)]
    public string? Slug { get; set; }

    [StringLength(120)]
    public string? ShortDescription { get; set; }

    [StringLength(2000)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? DiscountPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal BasePrice { get; set; }

    public int StockQuantity { get; set; }

    public int ViewCount { get; set; } = 0;

    public int CategoryId { get; set; }

    public string VendorId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<ProductImage>? ProductImages { get; set; }
}