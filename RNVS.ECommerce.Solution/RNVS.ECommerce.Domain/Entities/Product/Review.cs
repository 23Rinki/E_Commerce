using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Product;

public class Review
{
    public int Id { get; set; }

    public int Rating { get; set; } // 1-5 stars

    [StringLength(1000)]
    public string? Comment { get; set; }

    public int ProductId { get; set; }

    public string? VendorId { get; set; }

    public string UserId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsApproved { get; set; } = false;
}