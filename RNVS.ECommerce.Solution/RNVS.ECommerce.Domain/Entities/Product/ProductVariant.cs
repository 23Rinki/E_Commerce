using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RNVS.ECommerce.Domain.Entities.Product;

public class ProductVariant
{
    public int Id { get; set; }

    public int ProductId { get; set; }

    public string? VendorId { get; set; }

    [Required]
    [StringLength(50)]
    public string SKU { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? CompareAtPrice { get; set; }

    public int StockQuantity { get; set; }

    [StringLength(1000)]
    public string? Attributes { get; set; } // JSON: {"color":"Red","size":"Large"}

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
