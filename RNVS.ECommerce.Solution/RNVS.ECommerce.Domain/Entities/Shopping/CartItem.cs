using System.ComponentModel.DataAnnotations.Schema;

namespace RNVS.ECommerce.Domain.Entities.Shopping;

public class CartItem
{
    public int Id { get; set; }

    public int CartId { get; set; }

    public int ProductId { get; set; }

    public string? VendorId { get; set; }

    public int Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Product.Product? Product { get; set; }
}