using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Receipt;

public class BrandingSettings
{
    public int Id { get; set; }

    public string VendorId { get; set; } = string.Empty;

    [StringLength(7)]
    public string PrimaryColor { get; set; } = "#000000";

    [StringLength(7)]
    public string SecondaryColor { get; set; } = "#FFFFFF";

    [StringLength(50)]
    public string FontFamily { get; set; } = "Arial";

    [StringLength(500)]
    public string? LogoUrl { get; set; }

    public int LogoSize { get; set; } = 100;

    // Receipt store details
    [StringLength(200)]
    public string? StoreName { get; set; }

    [StringLength(500)]
    public string? StoreAddress { get; set; }

    [StringLength(50)]
    public string? StorePhone { get; set; }

    [StringLength(200)]
    public string? StoreEmail { get; set; }

    [StringLength(200)]
    public string? Website { get; set; }

    [StringLength(50)]
    public string? GstNumber { get; set; }

    // JSON arrays: [{"id":"...","label":"..."}]
    public string? BillFieldsJson { get; set; }
    public string? CustomerFieldsJson { get; set; }

    // Vendor's own pre-designed receipt image — used as page 1 of the PDF receipt
    [StringLength(500)]
    public string? CustomReceiptImageUrl { get; set; }

    // Receipt Designer (Jul 2026) — layout + extras
    [StringLength(20)]
    public string TemplateStyle { get; set; } = "classic"; // classic | standard | thermal | minimal

    public bool ShowQrCode { get; set; } = true;

    [StringLength(300)]
    public string? QrValue { get; set; } // vendor's payment link / website shown as QR on every receipt

    // UPI payment QR — when enabled, the QR encodes a upi://pay deep link generated per receipt
    // from the real order amount + order number, instead of the static QrValue above.
    public bool UseUpiQr { get; set; } = false;

    [StringLength(100)]
    public string? UpiId { get; set; } // vendor's VPA, e.g. storename@okhdfcbank

    public bool ShowBarcode { get; set; } = true; // barcode always encodes the real order number

    [StringLength(300)]
    public string? FooterNote { get; set; }

    [StringLength(100)]
    public string? SignatureText { get; set; }

    [StringLength(500)]
    public string? SignatureImageUrl { get; set; }

    // How the real order tax amount is split for display (percentages of the TOTAL TAX, not the subtotal —
    // e.g. 50/50/0 shows an intra-state CGST+SGST split, 0/0/100 shows an inter-state IGST-only line).
    // The actual amount charged always comes from the order; these only control the on-paper breakdown.
    public decimal CgstPercent { get; set; } = 50;
    public decimal SgstPercent { get; set; } = 50;
    public decimal IgstPercent { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}