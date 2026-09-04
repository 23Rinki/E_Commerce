using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Platform;

/// <summary>
/// Audit record of an image removed by an admin via the moderation tool.
/// The actual file is archived (moved), not deleted — this row is just the paper trail.
/// Lives in the Master DB, same as RemovedVendorRecord.
/// </summary>
public class RemovedProductImage
{
    public int Id { get; set; }

    [Required]
    [StringLength(450)]
    public string VendorId { get; set; } = string.Empty;

    [StringLength(256)]
    public string VendorName { get; set; } = string.Empty;

    public int ProductId { get; set; }

    [StringLength(200)]
    public string ProductName { get; set; } = string.Empty;

    [StringLength(500)]
    public string OriginalImagePath { get; set; } = string.Empty;

    [StringLength(500)]
    public string ArchivedImagePath { get; set; } = string.Empty;

    [StringLength(256)]
    public string RemovedBy { get; set; } = string.Empty;

    public DateTime RemovedAt { get; set; } = DateTime.UtcNow;
}
