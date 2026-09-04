namespace RNVS.ECommerce.Domain.Entities.Shopping;

public class Wishlist
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public int ProductId { get; set; }

    public string? VendorId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}