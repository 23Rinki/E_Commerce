namespace RNVS.ECommerce.Domain.Entities.Shopping;

public class Cart
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string? VendorId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public ICollection<CartItem>? CartItems { get; set; }
}