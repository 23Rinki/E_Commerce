namespace RNVS.ECommerce.Application.DTOs.Product;

public class ProductDetailsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public int StockQuantity { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string VendorName { get; set; } = string.Empty;
    public string? VendorId { get; set; }
    public List<string> ImageUrls { get; set; } = new();
    public List<ProductImageRefDto> Images { get; set; } = new();
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
}

// Carries the image's database Id alongside its path, needed for admin/vendor image-removal actions.
public class ProductImageRefDto
{
    public int Id { get; set; }
    public string ImagePath { get; set; } = string.Empty;
}