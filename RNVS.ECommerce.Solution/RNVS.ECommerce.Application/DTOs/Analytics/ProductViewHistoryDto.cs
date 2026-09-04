namespace RNVS.ECommerce.Application.DTOs.Analytics;

public class ProductViewHistoryDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? UserId { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public DateTime ViewedAt { get; set; }
}
