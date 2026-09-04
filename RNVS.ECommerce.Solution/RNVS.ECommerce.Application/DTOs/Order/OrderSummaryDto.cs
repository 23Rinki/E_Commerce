namespace RNVS.ECommerce.Application.DTOs.Order;

public class OrderSummaryDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public int ItemCount { get; set; }
}