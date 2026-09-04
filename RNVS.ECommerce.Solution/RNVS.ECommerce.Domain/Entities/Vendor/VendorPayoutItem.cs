using System.ComponentModel.DataAnnotations.Schema;

namespace RNVS.ECommerce.Domain.Entities.Vendor;

public class VendorPayoutItem
{
    public int Id { get; set; }

    public int PayoutId { get; set; }

    public string? VendorId { get; set; }

    public int OrderId { get; set; }

    public int OrderItemId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
