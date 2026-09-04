namespace RNVS.ECommerce.Domain.Entities.Inventory;

public class Stock
{
    public int Id { get; set; }

    public int ProductId { get; set; }

    public string? VendorId { get; set; }

    public int CurrentQuantity { get; set; }

    public int ReservedQuantity { get; set; }

    public int MinimumThreshold { get; set; } = 0;

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    public int AvailableQuantity => CurrentQuantity - ReservedQuantity;
}