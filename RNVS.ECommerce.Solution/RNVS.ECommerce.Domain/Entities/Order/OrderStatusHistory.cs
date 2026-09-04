using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Order;

public class OrderStatusHistory
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public string? VendorId { get; set; }

    public OrderStatus PreviousStatus { get; set; }

    public OrderStatus NewStatus { get; set; }

    [StringLength(450)]
    public string? UpdatedBy { get; set; } // UserId

    [StringLength(500)]
    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
