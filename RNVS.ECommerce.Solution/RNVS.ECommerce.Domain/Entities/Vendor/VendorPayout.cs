using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Vendor;

public class VendorPayout
{
    public int Id { get; set; }

    [Required]
    [StringLength(450)]
    public string VendorId { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string PayoutNumber { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [StringLength(3)]
    public string Currency { get; set; } = "INR";

    public PayoutStatus Status { get; set; } = PayoutStatus.Pending;

    [StringLength(50)]
    public string? PaymentMethod { get; set; }

    [StringLength(200)]
    public string? TransactionReference { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public int OrderCount { get; set; }

    public DateTime? ProcessedAt { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
