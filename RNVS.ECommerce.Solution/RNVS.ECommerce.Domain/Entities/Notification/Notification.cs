using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Notification;

public class Notification
{
    public int Id { get; set; }

    [Required]
    [StringLength(450)]
    public string UserId { get; set; } = string.Empty;

    public string? VendorId { get; set; }

    public NotificationType Type { get; set; }

    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Message { get; set; } = string.Empty;

    public bool IsRead { get; set; } = false;

    public DateTime? ReadAt { get; set; }

    [StringLength(500)]
    public string? ActionUrl { get; set; }

    [StringLength(1000)]
    public string? Metadata { get; set; } // JSON

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
