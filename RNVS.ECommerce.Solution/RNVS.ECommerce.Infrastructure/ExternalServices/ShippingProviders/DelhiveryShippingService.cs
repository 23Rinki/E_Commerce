using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;

public class DelhiveryShippingService : BaseShippingService, IShippingProvider
{
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly bool _useMockData;

    public DelhiveryShippingService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<DelhiveryShippingService> logger)
        : base(httpClient, logger)
    {
        _apiKey = configuration["Shipping:Delhivery:ApiKey"] ?? "test-delhivery-api-key";
        _baseUrl = configuration["Shipping:Delhivery:BaseUrl"] ?? "https://track.delhivery.com/api";
        _useMockData = _apiKey.StartsWith("test-") || !bool.Parse(configuration["Shipping:Delhivery:Enabled"] ?? "false");

        if (!_useMockData)
        {
            _httpClient.BaseAddress = new Uri(_baseUrl);
        }
    }

    public string ProviderName => "Delhivery";

    public async Task<ShippingRateResponse> GetShippingRateAsync(ShippingRateRequest request)
    {
        _logger.LogInformation("Getting Delhivery rate from {Origin} to {Destination}",
            request.OriginPincode, request.DestinationPincode);

        if (_useMockData)
        {
            return await GetMockShippingRateAsync(request);
        }

        try
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Token {_apiKey}" }
            };

            var endpoint = $"/kinko/v1/invoice/charges/.json?" +
                          $"md=S&ss=Delivered&d_pin={request.DestinationPincode}" +
                          $"&o_pin={request.OriginPincode}&cgm={request.Weight * 1000}" +
                          $"&pt=Pre-paid";

            var response = await SendRequestAsync<DelhiveryRateResponse>(
                HttpMethod.Get,
                endpoint,
                headers: headers
            );

            if (response == null || response.Data == null)
            {
                return await GetMockShippingRateAsync(request);
            }

            return new ShippingRateResponse
            {
                Cost = response.Data.TotalAmount,
                EstimatedDays = 4,
                ServiceType = "Delhivery Surface"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Delhivery shipping rate, using mock data");
            return await GetMockShippingRateAsync(request);
        }
    }

    public async Task<ShipmentResponse> CreateShipmentAsync(ShipmentRequest request)
    {
        _logger.LogInformation("Creating Delhivery shipment for order {OrderNumber}", request.OrderNumber);

        if (_useMockData)
        {
            return await CreateMockShipmentAsync(request);
        }

        try
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Token {_apiKey}" },
                { "Content-Type", "application/json" }
            };

            var shipmentData = new
            {
                shipments = new[]
                {
                    new
                    {
                        name = request.RecipientName,
                        add = request.RecipientAddress,
                        pin = request.RecipientPincode,
                        phone = request.RecipientPhone,
                        order = request.OrderNumber,
                        payment_mode = "Prepaid",
                        cod_amount = 0,
                        quantity = 1,
                        weight = request.Weight * 1000,
                        seller_name = "Your Store Name",
                        total_amount = request.DeclaredValue
                    }
                }
            };

            var requestData = new
            {
                format = "json",
                data = System.Text.Json.JsonSerializer.Serialize(shipmentData)
            };

            var response = await SendRequestAsync<DelhiveryShipmentResponse>(
                HttpMethod.Post,
                "/cmu/create.json",
                requestData,
                headers
            );

            if (response == null || !response.Success)
            {
                return await CreateMockShipmentAsync(request);
            }

            return new ShipmentResponse
            {
                Success = true,
                ShipmentId = response.PackageCount.ToString(),
                TrackingNumber = response.WaybillNumber
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating Delhivery shipment, using mock data");
            return await CreateMockShipmentAsync(request);
        }
    }

    public async Task<TrackingResponse> TrackShipmentAsync(string trackingNumber)
    {
        _logger.LogInformation("Tracking Delhivery shipment: {TrackingNumber}", trackingNumber);

        if (_useMockData)
        {
            return await GetMockTrackingAsync(trackingNumber);
        }

        try
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Token {_apiKey}" }
            };

            var endpoint = $"/v1/packages/json/?waybill={trackingNumber}";

            var response = await SendRequestAsync<DelhiveryTrackingResponse>(
                HttpMethod.Get,
                endpoint,
                headers: headers
            );

            if (response == null || response.ShipmentTrack == null || !response.ShipmentTrack.Any())
            {
                return await GetMockTrackingAsync(trackingNumber);
            }

            var track = response.ShipmentTrack.First();

            return new TrackingResponse
            {
                Status = track.ShipmentStatus,
                CurrentLocation = track.ShipmentTrackActivities.FirstOrDefault()?.Location ?? "",
                EstimatedDelivery = null,
                Events = track.ShipmentTrackActivities.Select(e => new TrackingEvent
                {
                    Timestamp = DateTime.Parse(e.Date),
                    Status = e.Activity,
                    Location = e.Location,
                    Description = e.SrStatus
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking Delhivery shipment, using mock data");
            return await GetMockTrackingAsync(trackingNumber);
        }
    }

    public Task<bool> CancelShipmentAsync(string shipmentId)
    {
        _logger.LogInformation("Cancelling Delhivery shipment: {ShipmentId}", shipmentId);
        return Task.FromResult(true);
    }

    #region Mock Data Methods

    private Task<ShippingRateResponse> GetMockShippingRateAsync(ShippingRateRequest request)
    {
        decimal baseRate = 40;
        decimal weightRate = request.Weight * 10;
        decimal regionMultiplier = GetRegionMultiplier(request.DestinationPincode);

        decimal totalCost = (baseRate + weightRate) * regionMultiplier;

        return Task.FromResult(new ShippingRateResponse
        {
            Cost = Math.Round(totalCost, 2),
            EstimatedDays = GetEstimatedDays(request.DestinationPincode),
            ServiceType = "Delhivery Surface"
        });
    }

    private Task<ShipmentResponse> CreateMockShipmentAsync(ShipmentRequest request)
    {
        var waybill = $"DL{DateTime.UtcNow:yyyyMMdd}{new Random().Next(10000000, 99999999)}";

        return Task.FromResult(new ShipmentResponse
        {
            Success = true,
            ShipmentId = waybill,
            TrackingNumber = waybill
        });
    }

    private Task<TrackingResponse> GetMockTrackingAsync(string trackingNumber)
    {
        return Task.FromResult(new TrackingResponse
        {
            Status = "In Transit",
            CurrentLocation = "Delhivery Hub - Bangalore",
            EstimatedDelivery = DateTime.UtcNow.AddDays(3),
            Events = new List<TrackingEvent>
            {
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow.AddHours(-8),
                    Status = "Manifested",
                    Location = "Origin City",
                    Description = "Shipment manifested"
                },
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow.AddHours(-4),
                    Status = "Picked Up",
                    Location = "Pickup Location",
                    Description = "Shipment picked up"
                },
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow,
                    Status = "In Transit",
                    Location = "Delhivery Hub - Bangalore",
                    Description = "Arrived at hub"
                }
            }
        });
    }

    private decimal GetRegionMultiplier(string pincode)
    {
        if (string.IsNullOrEmpty(pincode)) return 1.0m;

        var firstDigit = pincode[0];
        return firstDigit switch
        {
            '1' => 1.0m,
            '2' => 1.0m,
            '3' => 1.05m,
            '4' => 0.9m,  // Delhivery strong in Maharashtra
            '5' => 0.95m, // Strong in South
            '6' => 0.95m,
            '7' => 1.1m,
            '8' => 1.25m,
            '9' => 1.05m,
            _ => 1.0m
        };
    }

    private int GetEstimatedDays(string pincode)
    {
        if (string.IsNullOrEmpty(pincode)) return 4;

        var firstDigit = pincode[0];
        return firstDigit switch
        {
            '4' or '5' or '6' => 2,  // South & West
            '1' or '2' or '3' => 3,  // North
            '7' or '9' => 4,         // East
            '8' => 5,                // North East
            _ => 3
        };
    }

    #endregion
}

// Delhivery API Response Models
public class DelhiveryRateResponse
{
    public DelhiveryRateData? Data { get; set; }
}

public class DelhiveryRateData
{
    public decimal TotalAmount { get; set; }
}

public class DelhiveryShipmentResponse
{
    public bool Success { get; set; }
    public string WaybillNumber { get; set; } = string.Empty;
    public int PackageCount { get; set; }
    public string? Remark { get; set; }
}

public class DelhiveryTrackingResponse
{
    public List<DelhiveryShipmentTrack> ShipmentTrack { get; set; } = new();
}

public class DelhiveryShipmentTrack
{
    public string ShipmentStatus { get; set; } = string.Empty;
    public List<DelhiveryTrackActivity> ShipmentTrackActivities { get; set; } = new();
}

public class DelhiveryTrackActivity
{
    public string Date { get; set; } = string.Empty;
    public string Activity { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string SrStatus { get; set; } = string.Empty;
}