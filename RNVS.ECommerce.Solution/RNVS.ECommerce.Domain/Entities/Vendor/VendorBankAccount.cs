using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Vendor;

public class VendorBankAccount
{
    public int Id { get; set; }

    [Required]
    [StringLength(450)]
    public string VendorId { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string AccountHolderName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string BankName { get; set; } = string.Empty;

    [Required]
    [StringLength(18)]
    public string AccountNumber { get; set; } = string.Empty;

    /// <summary>11-character Indian bank IFSC code e.g. HDFC0001234</summary>
    [Required]
    [StringLength(11)]
    public string IfscCode { get; set; } = string.Empty;

    /// <summary>Savings or Current</summary>
    [StringLength(20)]
    public string AccountType { get; set; } = "Savings";

    /// <summary>Optional UPI ID e.g. name@upi</summary>
    [StringLength(100)]
    public string? UpiId { get; set; }

    /// <summary>Set to true by platform admin after manual verification.</summary>
    public bool IsVerified { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
