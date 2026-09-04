namespace RNVS.ECommerce.Infrastructure.Search.Models;

public class SearchIndex
{
    public string Id { get; set; } = string.Empty;       // composite: {vendorId}_{productId}
    public string ProductId { get; set; } = string.Empty; // actual product ID for URLs
    public string Type { get; set; } = string.Empty; // Product, Category, Vendor
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public int ViewCount { get; set; }
    public int SalesCount { get; set; }
    public double Rating { get; set; }
    public string VendorId { get; set; } = string.Empty;
    public string VendorName { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
    public decimal? DiscountPrice { get; set; }
    public string CategoryId { get; set; } = string.Empty;
}