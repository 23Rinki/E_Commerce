using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Product;

public class ProductViewHistory
{
    public int Id { get; set; }

    [StringLength(450)]
    public string UserId { get; set; } = string.Empty;

    public int ProductId { get; set; }

    public string? VendorId { get; set; }

    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    [StringLength(250)]
    public string? IpAddress { get; set; }

    [StringLength(500)]
    public string? UserAgent { get; set; }

    [StringLength(500)]
    public string? Referrer { get; set; }

    // Navigation properties
    public Product? Product { get; set; }
}
