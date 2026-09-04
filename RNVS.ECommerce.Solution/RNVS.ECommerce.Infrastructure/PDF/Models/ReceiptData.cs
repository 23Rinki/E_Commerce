namespace RNVS.ECommerce.Infrastructure.PDF.Models;

public class ReceiptData
{
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string OrderId { get; set; } = string.Empty;

    // Company Information
    public CompanyInfo Company { get; set; } = new();

    // Customer Information
    public CustomerInfo Customer { get; set; } = new();

    // Items
    public List<ReceiptItem> Items { get; set; } = new();

    // Totals
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Shipping { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }

    // Payment
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;

    // Additional
    public string Notes { get; set; } = string.Empty;
    public string ThankYouMessage { get; set; } = "Thank you for your purchase!";
}

public class CompanyInfo
{
    public string Name { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    // Full file-system path to the vendor's custom receipt image (null = use system receipt)
    public string? CustomReceiptImagePath { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string TaxId { get; set; } = string.Empty;
    public string PrimaryColor { get; set; } = "#007bff";
    public string SecondaryColor { get; set; } = "#6c757d";
}

public class CustomerInfo
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class ReceiptItem
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
    public string SKU { get; set; } = string.Empty;
}