namespace RNVS.ECommerce.Application.DTOs.Wishlist;

public class WishlistDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public decimal? ProductPrice { get; set; }
    public string? ProductImageUrl { get; set; }
    public string? VendorId { get; set; }
    public DateTime CreatedAt { get; set; }
}
