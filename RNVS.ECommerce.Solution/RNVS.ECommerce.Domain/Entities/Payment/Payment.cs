using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Payment;

public class Payment
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public string? VendorId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Column("MethodId")]
    public Enums.PaymentMethod Method { get; set; }

    [Column("Status")]
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    [StringLength(100)]
    public string? TransactionId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessedAt { get; set; }
}