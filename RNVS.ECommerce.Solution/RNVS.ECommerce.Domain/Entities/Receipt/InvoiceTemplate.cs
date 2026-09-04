using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Receipt;

public class InvoiceTemplate
{
    public int Id { get; set; }

    public string VendorId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [Required]
    public string HtmlTemplate { get; set; } = string.Empty;

    public bool IsDefault { get; set; } = false;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}