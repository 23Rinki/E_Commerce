namespace RNVS.ECommerce.Application.DTOs.Product;

public class ProductListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public int? PrimaryImageId { get; set; }
    public int StockQuantity { get; set; }
    public string? VendorId { get; set; }
    public string VendorName { get; set; } = string.Empty;
}