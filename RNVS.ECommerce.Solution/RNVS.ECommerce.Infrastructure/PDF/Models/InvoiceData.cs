namespace RNVS.ECommerce.Infrastructure.PDF.Models;

public class InvoiceData : ReceiptData
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public string PurchaseOrderNumber { get; set; } = string.Empty;
    public string Terms { get; set; } = "Net 30";
    public BillingInfo BillingAddress { get; set; } = new();
    public ShippingInfo ShippingAddress { get; set; } = new();
    public string InvoiceStatus { get; set; } = "Unpaid"; // Unpaid, Paid, Overdue
}

public class BillingInfo
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class ShippingInfo
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}