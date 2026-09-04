namespace RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;

public class SelfPickupService : IShippingProvider
{
    public string ProviderName => "Self Pickup";

    public Task<ShippingRateResponse> GetShippingRateAsync(ShippingRateRequest request)
    {
        return Task.FromResult(new ShippingRateResponse
        {
            Cost = 0, // No shipping cost for pickup
            EstimatedDays = 0,
            ServiceType = "Self Pickup"
        });
    }

    public Task<ShipmentResponse> CreateShipmentAsync(ShipmentRequest request)
    {
        var pickupId = Guid.NewGuid().ToString();

        return Task.FromResult(new ShipmentResponse
        {
            Success = true,
            ShipmentId = pickupId,
            TrackingNumber = $"PICKUP{DateTime.UtcNow:yyyyMMdd}{pickupId.Substring(0, 6)}"
        });
    }

    public Task<TrackingResponse> TrackShipmentAsync(string trackingNumber)
    {
        return Task.FromResult(new TrackingResponse
        {
            Status = "Ready for Pickup",
            CurrentLocation = "Store",
            EstimatedDelivery = null
        });
    }

    public Task<bool> CancelShipmentAsync(string shipmentId)
    {
        return Task.FromResult(true);
    }
}