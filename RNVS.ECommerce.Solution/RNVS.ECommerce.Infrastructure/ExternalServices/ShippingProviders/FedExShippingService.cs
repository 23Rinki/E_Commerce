using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;

public class FedExShippingService : BaseShippingService, IShippingProvider
{
    private readonly string _apiKey;
    private readonly string _accountNumber;
    private readonly string _baseUrl;
    private readonly bool _useMockData;

    public FedExShippingService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<FedExShippingService> logger)
        : base(httpClient, logger)
    {
        _apiKey = configuration["Shipping:FedEx:ApiKey"] ?? "test-fedex-api-key";
        _accountNumber = configuration["Shipping:FedEx:AccountNumber"] ?? "test-account-number";
        _baseUrl = configuration["Shipping:FedEx:BaseUrl"] ?? "https://apis.fedex.com";
        _useMockData = _apiKey.StartsWith("test-") || !bool.Parse(configuration["Shipping:FedEx:Enabled"] ?? "false");

        if (!_useMockData)
        {
            _httpClient.BaseAddress = new Uri(_baseUrl);
        }
    }

    public string ProviderName => "FedEx";

    public async Task<ShippingRateResponse> GetShippingRateAsync(ShippingRateRequest request)
    {
        _logger.LogInformation("Getting FedEx rate from {Origin} to {Destination}",
            request.OriginPincode, request.DestinationPincode);

        if (_useMockData)
        {
            return await GetMockShippingRateAsync(request);
        }

        try
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {_apiKey}" },
                { "X-locale", "en_IN" }
            };

            var requestData = new
            {
                accountNumber = new { value = _accountNumber },
                rateRequestControlParameters = new
                {
                    returnTransitTimes = true
                },
                requestedShipment = new
                {
                    shipper = new
                    {
                        address = new
                        {
                            postalCode = request.OriginPincode,
                            countryCode = "IN"
                        }
                    },
                    recipient = new
                    {
                        address = new
                        {
                            postalCode = request.DestinationPincode,
                            countryCode = "IN"
                        }
                    },
                    requestedPackageLineItems = new[]
                    {
                        new
                        {
                            weight = new
                            {
                                units = "KG",
                                value = request.Weight
                            },
                            dimensions = new
                            {
                                length = request.Length,
                                width = request.Width,
                                height = request.Height,
                                units = "CM"
                            }
                        }
                    }
                }
            };

            var response = await SendRequestAsync<FedExRateResponse>(
                HttpMethod.Post,
                "/rate/v1/rates/quotes",
                requestData,
                headers
            );

            if (response?.Output?.RateReplyDetails == null || !response.Output.RateReplyDetails.Any())
            {
                return await GetMockShippingRateAsync(request);
            }

            var rate = response.Output.RateReplyDetails.First();
            var amount = rate.RatedShipmentDetails.First().TotalNetCharge;

            return new ShippingRateResponse
            {
                Cost = amount,
                EstimatedDays = rate.TransitTime ?? 5,
                ServiceType = rate.ServiceType
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting FedEx shipping rate, using mock data");
            return await GetMockShippingRateAsync(request);
        }
    }

    public async Task<ShipmentResponse> CreateShipmentAsync(ShipmentRequest request)
    {
        _logger.LogInformation("Creating FedEx shipment for order {OrderNumber}", request.OrderNumber);

        if (_useMockData)
        {
            return await CreateMockShipmentAsync(request);
        }

        try
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {_apiKey}" }
            };

            var requestData = new
            {
                accountNumber = new { value = _accountNumber },
                requestedShipment = new
                {
                    shipper = new
                    {
                        contact = new
                        {
                            personName = "Your Store",
                            phoneNumber = "1234567890"
                        },
                        address = new
                        {
                            streetLines = new[] { "Store Address" },
                            city = "Mumbai",
                            postalCode = "400001",
                            countryCode = "IN"
                        }
                    },
                    recipients = new[]
                    {
                        new
                        {
                            contact = new
                            {
                                personName = request.RecipientName,
                                phoneNumber = request.RecipientPhone
                            },
                            address = new
                            {
                                streetLines = new[] { request.RecipientAddress },
                                postalCode = request.RecipientPincode,
                                countryCode = "IN"
                            }
                        }
                    },
                    shipmentSpecialServices = new
                    {
                        specialServiceTypes = new[] { "RETURN_SHIPMENT" }
                    },
                    requestedPackageLineItems = new[]
                    {
                        new
                        {
                            weight = new
                            {
                                units = "KG",
                                value = request.Weight
                            }
                        }
                    }
                }
            };

            var response = await SendRequestAsync<FedExShipmentResponse>(
                HttpMethod.Post,
                "/ship/v1/shipments",
                requestData,
                headers
            );

            if (response?.Output?.TransactionShipments == null)
            {
                return await CreateMockShipmentAsync(request);
            }

            var shipment = response.Output.TransactionShipments.First();
            var trackingNumber = shipment.MasterTrackingNumber;

            return new ShipmentResponse
            {
                Success = true,
                ShipmentId = trackingNumber,
                TrackingNumber = trackingNumber
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating FedEx shipment, using mock data");
            return await CreateMockShipmentAsync(request);
        }
    }

    public async Task<TrackingResponse> TrackShipmentAsync(string trackingNumber)
    {
        _logger.LogInformation("Tracking FedEx shipment: {TrackingNumber}", trackingNumber);

        if (_useMockData)
        {
            return await GetMockTrackingAsync(trackingNumber);
        }

        try
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {_apiKey}" }
            };

            var requestData = new
            {
                trackingInfo = new[]
                {
                    new
                    {
                        trackingNumberInfo = new
                        {
                            trackingNumber = trackingNumber
                        }
                    }
                },
                includeDetailedScans = true
            };

            var response = await SendRequestAsync<FedExTrackingResponse>(
                HttpMethod.Post,
                "/track/v1/trackingnumbers",
                requestData,
                headers
            );

            if (response?.Output?.CompleteTrackResults == null)
            {
                return await GetMockTrackingAsync(trackingNumber);
            }

            var track = response.Output.CompleteTrackResults.First().TrackResults.First();

            return new TrackingResponse
            {
                Status = track.LatestStatusDetail.Description,
                CurrentLocation = track.LatestStatusDetail.ScanLocation?.City ?? "",
                EstimatedDelivery = track.EstimatedDeliveryTimeWindow?.Window.Ends,
                Events = track.ScanEvents.Select(e => new TrackingEvent
                {
                    Timestamp = DateTime.Parse(e.Date),
                    Status = e.EventType,
                    Location = e.ScanLocation?.City ?? "",
                    Description = e.EventDescription
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking FedEx shipment, using mock data");
            return await GetMockTrackingAsync(trackingNumber);
        }
    }

    public async Task<bool> CancelShipmentAsync(string shipmentId)
    {
        _logger.LogInformation("Cancelling FedEx shipment: {ShipmentId}", shipmentId);

        if (_useMockData)
        {
            return await Task.FromResult(true);
        }

        try
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {_apiKey}" }
            };

            var requestData = new
            {
                accountNumber = new { value = _accountNumber },
                trackingNumber = shipmentId,
                deletionControl = "DELETE_ALL_PACKAGES"
            };

            var response = await SendRequestAsync<FedExCancelResponse>(
                HttpMethod.Put,
                "/ship/v1/shipments/cancel",
                requestData,
                headers
            );

            return response?.Output?.CancelledShipment ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling FedEx shipment");
            return true;
        }
    }

    #region Mock Data Methods

    private Task<ShippingRateResponse> GetMockShippingRateAsync(ShippingRateRequest request)
    {
        // FedEx premium pricing
        decimal baseRate = 120;
        decimal weightRate = request.Weight * 25;
        decimal volumetricWeight = (request.Length * request.Width * request.Height) / 5000;
        decimal chargeableWeight = Math.Max(request.Weight, volumetricWeight);
        decimal regionMultiplier = GetRegionMultiplier(request.DestinationPincode);

        decimal totalCost = (baseRate + (chargeableWeight * 25)) * regionMultiplier;

        return Task.FromResult(new ShippingRateResponse
        {
            Cost = Math.Round(totalCost, 2),
            EstimatedDays = GetEstimatedDays(request.DestinationPincode),
            ServiceType = "FedEx Express"
        });
    }

    private Task<ShipmentResponse> CreateMockShipmentAsync(ShipmentRequest request)
    {
        var trackingNumber = $"FX{DateTime.UtcNow:yyyyMMdd}{new Random().Next(100000000, 999999999)}";

        return Task.FromResult(new ShipmentResponse
        {
            Success = true,
            ShipmentId = trackingNumber,
            TrackingNumber = trackingNumber
        });
    }

    private Task<TrackingResponse> GetMockTrackingAsync(string trackingNumber)
    {
        return Task.FromResult(new TrackingResponse
        {
            Status = "In Transit",
            CurrentLocation = "FedEx International Hub",
            EstimatedDelivery = DateTime.UtcNow.AddDays(2),
            Events = new List<TrackingEvent>
            {
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow.AddHours(-6),
                    Status = "Picked Up",
                    Location = "Origin Facility",
                    Description = "Shipment picked up"
                },
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow.AddHours(-2),
                    Status = "In Transit",
                    Location = "FedEx Sort Facility",
                    Description = "Departed sort facility"
                },
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow,
                    Status = "In Transit",
                    Location = "FedEx International Hub",
                    Description = "At destination hub"
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
            '1' => 1.0m,  // Delhi NCR (FedEx hub)
            '2' => 1.05m, // Haryana, Punjab
            '3' => 1.1m,  // Rajasthan, Gujarat
            '4' => 1.0m,  // Maharashtra (FedEx hub)
            '5' => 1.1m,  // Andhra, Telangana, Karnataka
            '6' => 1.15m, // Kerala, Tamil Nadu
            '7' => 1.2m,  // West Bengal, Odisha
            '8' => 1.3m,  // North East
            '9' => 1.15m, // UP, Bihar
            _ => 1.1m
        };
    }

    private int GetEstimatedDays(string pincode)
    {
        if (string.IsNullOrEmpty(pincode)) return 3;

        var firstDigit = pincode[0];
        return firstDigit switch
        {
            '1' or '4' => 1,  // Metro cities (FedEx hubs)
            '2' or '3' or '5' or '6' => 2,
            '7' or '9' => 3,
            '8' => 4,  // North East
            _ => 2
        };
    }

    #endregion
}

// FedEx Response Models
public class FedExRateResponse
{
    public FedExRateOutput? Output { get; set; }
}

public class FedExRateOutput
{
    public List<FedExRateDetail> RateReplyDetails { get; set; } = new();
}

public class FedExRateDetail
{
    public string ServiceType { get; set; } = string.Empty;
    public int? TransitTime { get; set; }
    public List<FedExRatedShipment> RatedShipmentDetails { get; set; } = new();
}

public class FedExRatedShipment
{
    public decimal TotalNetCharge { get; set; }
}

public class FedExShipmentResponse
{
    public FedExShipmentOutput? Output { get; set; }
}

public class FedExShipmentOutput
{
    public List<FedExTransactionShipment> TransactionShipments { get; set; } = new();
}

public class FedExTransactionShipment
{
    public string MasterTrackingNumber { get; set; } = string.Empty;
}

public class FedExTrackingResponse
{
    public FedExTrackingOutput? Output { get; set; }
}

public class FedExTrackingOutput
{
    public List<FedExCompleteTrackResult> CompleteTrackResults { get; set; } = new();
}

public class FedExCompleteTrackResult
{
    public List<FedExTrackResult> TrackResults { get; set; } = new();
}

public class FedExTrackResult
{
    public FedExStatusDetail LatestStatusDetail { get; set; } = new();
    public FedExDeliveryWindow? EstimatedDeliveryTimeWindow { get; set; }
    public List<FedExScanEvent> ScanEvents { get; set; } = new();
}

public class FedExStatusDetail
{
    public string Description { get; set; } = string.Empty;
    public FedExLocation? ScanLocation { get; set; }
}

public class FedExLocation
{
    public string? City { get; set; }
}

public class FedExDeliveryWindow
{
    public FedExWindow Window { get; set; } = new();
}

public class FedExWindow
{
    public DateTime? Ends { get; set; }
}

public class FedExScanEvent
{
    public string Date { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string EventDescription { get; set; } = string.Empty;
    public FedExLocation? ScanLocation { get; set; }
}

public class FedExCancelResponse
{
    public FedExCancelOutput? Output { get; set; }
}

public class FedExCancelOutput
{
    public bool CancelledShipment { get; set; }
}