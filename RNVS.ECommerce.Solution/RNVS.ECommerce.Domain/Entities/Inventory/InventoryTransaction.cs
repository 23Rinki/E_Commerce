using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Inventory;

public class InventoryTransaction
{
    public int Id { get; set; }
    public int ProductId { get; set; }

    public string? VendorId { get; set; }

    public int Quantity { get; set; }
    public InventoryTransactionType Type { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [StringLength(100)]
    public string? ReferenceNumber { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string CreatedBy { get; set; } = string.Empty;
}