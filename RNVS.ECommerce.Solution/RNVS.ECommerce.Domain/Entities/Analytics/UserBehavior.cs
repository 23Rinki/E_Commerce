using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Analytics;

public class UserBehavior
{
    public int Id { get; set; }

    [StringLength(450)]
    public string? UserId { get; set; }

    public string? VendorId { get; set; }

    [Required]
    [StringLength(100)]
    public string SessionId { get; set; } = string.Empty;

    public UserEventType EventType { get; set; }

    public int? ProductId { get; set; }

    public int? CategoryId { get; set; }

    [StringLength(200)]
    public string? SearchQuery { get; set; }

    public string? Metadata { get; set; } // JSON

    [StringLength(45)]
    public string? IPAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
