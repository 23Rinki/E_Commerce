using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Platform;

/// <summary>
/// One row per flagged product — either auto-flagged by the banned-word filter
/// or raised by a customer report. Lives in the Master DB (the product itself
/// stays in the vendor's own database; this just tracks the review queue).
/// </summary>
public class ModerationFlag
{
    public int Id { get; set; }

    [Required]
    [StringLength(450)]
    public string VendorId { get; set; } = string.Empty;

    public int ProductId { get; set; }

    public ModerationReason Reason { get; set; }

    [StringLength(500)]
    public string? Detail { get; set; }

    public ModerationStatus Status { get; set; } = ModerationStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }

    [StringLength(450)]
    public string? ResolvedBy { get; set; }
}
