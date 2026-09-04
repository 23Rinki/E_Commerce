using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Notification;

public class EmailQueue
{
    public int Id { get; set; }

    public string? VendorId { get; set; }

    [Required]
    [StringLength(200)]
    public string To { get; set; } = string.Empty;

    [Required]
    [StringLength(300)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Body { get; set; } = string.Empty;

    public EmailPriority Priority { get; set; } = EmailPriority.Normal;

    public EmailStatus Status { get; set; } = EmailStatus.Pending;

    public int Attempts { get; set; } = 0;

    public DateTime? LastAttemptAt { get; set; }

    public DateTime? SentAt { get; set; }

    [StringLength(1000)]
    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
