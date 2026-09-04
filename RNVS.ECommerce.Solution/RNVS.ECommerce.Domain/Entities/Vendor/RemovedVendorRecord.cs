namespace RNVS.ECommerce.Domain.Entities.Vendor;

public class RemovedVendorRecord
{
    public int Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string VendorName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string Plan { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public DateTime RemovedAt { get; set; } = DateTime.UtcNow;
}
