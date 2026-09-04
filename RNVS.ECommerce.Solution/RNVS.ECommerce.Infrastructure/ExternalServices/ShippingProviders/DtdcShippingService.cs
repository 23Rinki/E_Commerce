using Microsoft.Extensions.Configuration;

namespace RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;

public class DtdcShippingService : IShippingProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public DtdcShippingService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Shipping:Dtdc:ApiKey"] ?? "test-dtdc-api-key";
    }

    public string ProviderName => "DTDC";

    public async Task<ShippingRateResponse> GetShippingRateAsync(ShippingRateRequest request)
    {
        return await Task.FromResult(new ShippingRateResponse
        {
            Cost = CalculateDtdcRate(request),
            EstimatedDays = GetEstimatedDays(request.DestinationPincode),
            ServiceType = "DTDC Express"
        });
    }

    public async Task<ShipmentResponse> CreateShipmentAsync(ShipmentRequest request)
    {
        var shipmentId = Guid.NewGuid().ToString();
        return await Task.FromResult(new ShipmentResponse
        {
            Success = true,
            ShipmentId = shipmentId,
            TrackingNumber = $"DTDC{DateTime.UtcNow:yyyyMMdd}{new Random().Next(100000, 999999)}"
        });
    }

    public async Task<TrackingResponse> TrackShipmentAsync(string trackingNumber)
    {
        return await Task.FromResult(new TrackingResponse
        {
            Status = "In Transit",
            CurrentLocation = "DTDC Regional Hub",
            EstimatedDelivery = DateTime.UtcNow.AddDays(3),
            Events = new List<TrackingEvent>
            {
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow.AddHours(-4),
                    Status = "Picked Up",
                    Location = "Origin City",
                    Description = "Shipment picked up from sender"
                },
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow,
                    Status = "In Transit",
                    Location = "DTDC Regional Hub",
                    Description = "Shipment arrived at hub"
                }
            }
        });
    }

    public Task<bool> CancelShipmentAsync(string shipmentId)
    {
        return Task.FromResult(true);
    }

    private decimal CalculateDtdcRate(ShippingRateRequest request)
    {
        // Base rate + weight-based + region multiplier
        decimal baseRate = 45;
        decimal weightRate = request.Weight * 12;
        decimal regionMultiplier = GetRegionMultiplier(request.DestinationPincode);

        return Math.Round((baseRate + weightRate) * regionMultiplier, 2);
    }

    private decimal GetRegionMultiplier(string pincode)
    {
        if (string.IsNullOrEmpty(pincode)) return 1.0m;

        var firstDigit = pincode[0];
        return firstDigit switch
        {
            '1' => 1.0m,  // Delhi NCR
            '2' => 1.05m, // Haryana, Punjab
            '3' => 1.05m, // Rajasthan, Gujarat
            '4' => 0.95m, // Maharashtra (DTDC strong presence)
            '5' => 1.1m,  // Andhra, Telangana, Karnataka
            '6' => 1.1m,  // Kerala, Tamil Nadu
            '7' => 1.2m,  // West Bengal, Odisha
            '8' => 1.3m,  // North East
            '9' => 1.15m, // UP, Bihar
            _ => 1.1m
        };
    }

    private int GetEstimatedDays(string pincode)
    {
        if (string.IsNullOrEmpty(pincode)) return 4;

        var firstDigit = pincode[0];
        return firstDigit switch
        {
            '4' => 2,  // Maharashtra (local)
            '1' or '2' or '3' => 3,  // North India
            '5' or '6' => 3,  // South India
            '7' or '8' or '9' => 5,  // East/North East India
            _ => 4
        };
    }
}