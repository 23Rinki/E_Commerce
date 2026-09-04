using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Receipt;

public class CustomReceipt
{
    public int Id { get; set; }

    public string VendorId { get; set; } = string.Empty;

    public int InvoiceTemplateId { get; set; }

    [StringLength(500)]
    public string? CustomFooterText { get; set; }

    public bool ShowCompanyLogo { get; set; } = true;

    public bool ShowTaxDetails { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}