namespace RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;

public interface IShippingProvider
{
    Task<ShippingRateResponse> GetShippingRateAsync(ShippingRateRequest request);
    Task<ShipmentResponse> CreateShipmentAsync(ShipmentRequest request);
    Task<TrackingResponse> TrackShipmentAsync(string trackingNumber);
    Task<bool> CancelShipmentAsync(string shipmentId);
    string ProviderName { get; }
}

public class ShippingRateRequest
{
    public string OriginPincode { get; set; } = string.Empty;
    public string DestinationPincode { get; set; } = string.Empty;
    public decimal Weight { get; set; } // in kg
    public decimal Length { get; set; } // in cm
    public decimal Width { get; set; }
    public decimal Height { get; set; }
}

public class ShippingRateResponse
{
    public decimal Cost { get; set; }
    public int EstimatedDays { get; set; }
    public string ServiceType { get; set; } = string.Empty;
}

public class ShipmentRequest
{
    public string OrderNumber { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string RecipientAddress { get; set; } = string.Empty;
    public string RecipientPincode { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal DeclaredValue { get; set; }
}

public class ShipmentResponse
{
    public bool Success { get; set; }
    public string ShipmentId { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}

public class TrackingResponse
{
    public string Status { get; set; } = string.Empty;
    public string CurrentLocation { get; set; } = string.Empty;
    public DateTime? EstimatedDelivery { get; set; }
    public List<TrackingEvent> Events { get; set; } = new();
}

public class TrackingEvent
{
    public DateTime Timestamp { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}