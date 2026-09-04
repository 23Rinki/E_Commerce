using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.System;

public class ActivityLog
{
    public int Id { get; set; }

    [StringLength(450)]
    public string? UserId { get; set; }

    public string? VendorId { get; set; }

    [Required]
    [StringLength(100)]
    public string Action { get; set; } = string.Empty;

    [StringLength(50)]
    public string? EntityType { get; set; }

    public int? EntityId { get; set; }

    [StringLength(45)]
    public string? IPAddress { get; set; }

    [StringLength(500)]
    public string? UserAgent { get; set; }

    public string? Details { get; set; } // JSON

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
