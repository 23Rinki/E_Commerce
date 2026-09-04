namespace RNVS.ECommerce.Application.DTOs.Order;

public class OrderTrackingDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public string CurrentStatus { get; set; } = string.Empty;
    public DateTime EstimatedDelivery { get; set; }
    public string? TrackingNumber { get; set; }
}