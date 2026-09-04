namespace RNVS.ECommerce.Application.DTOs.Shopping;

public class WishlistDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime AddedAt { get; set; }
}