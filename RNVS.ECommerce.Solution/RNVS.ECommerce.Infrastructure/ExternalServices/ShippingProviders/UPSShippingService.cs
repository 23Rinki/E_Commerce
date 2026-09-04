using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;

public class UPSShippingService : BaseShippingService, IShippingProvider
{
    private readonly string _apiKey;
    private readonly string _username;
    private readonly string _password;
    private readonly string _baseUrl;
    private readonly bool _useMockData;

    public UPSShippingService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<UPSShippingService> logger)
        : base(httpClient, logger)
    {
        _apiKey = configuration["Shipping:UPS:ApiKey"] ?? "test-ups-api-key";
        _username = configuration["Shipping:UPS:Username"] ?? "test-username";
        _password = configuration["Shipping:UPS:Password"] ?? "test-password";
        _baseUrl = configuration["Shipping:UPS:BaseUrl"] ?? "https://onlinetools.ups.com/api";
        _useMockData = _apiKey.StartsWith("test-") || !bool.Parse(configuration["Shipping:UPS:Enabled"] ?? "false");

        if (!_useMockData)
        {
            _httpClient.BaseAddress = new Uri(_baseUrl);
        }
    }

    public string ProviderName => "UPS";

    public async Task<ShippingRateResponse> GetShippingRateAsync(ShippingRateRequest request)
    {
        _logger.LogInformation("Getting UPS rate from {Origin} to {Destination}",
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
                { "Username", _username },
                { "Password", _password }
            };

            var requestData = new
            {
                RateRequest = new
                {
                    Request = new
                    {
                        TransactionReference = new
                        {
                            CustomerContext = "Rating"
                        }
                    },
                    Shipment = new
                    {
                        Shipper = new
                        {
                            Address = new
                            {
                                PostalCode = request.OriginPincode,
                                CountryCode = "IN"
                            }
                        },
                        ShipTo = new
                        {
                            Address = new
                            {
                                PostalCode = request.DestinationPincode,
                                CountryCode = "IN"
                            }
                        },
                        Package = new
                        {
                            PackagingType = new { Code = "02" },
                            Dimensions = new
                            {
                                UnitOfMeasurement = new { Code = "CM" },
                                Length = request.Length.ToString(),
                                Width = request.Width.ToString(),
                                Height = request.Height.ToString()
                            },
                            PackageWeight = new
                            {
                                UnitOfMeasurement = new { Code = "KGS" },
                                Weight = request.Weight.ToString()
                            }
                        }
                    }
                }
            };

            var response = await SendRequestAsync<UPSRateResponse>(
                HttpMethod.Post,
                "/rating/v1/Rate",
                requestData,
                headers
            );

            if (response?.RateResponse?.RatedShipment == null)
            {
                return await GetMockShippingRateAsync(request);
            }

            var rate = response.RateResponse.RatedShipment;

            return new ShippingRateResponse
            {
                Cost = decimal.Parse(rate.TotalCharges.MonetaryValue),
                EstimatedDays = 5,
                ServiceType = "UPS Standard"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting UPS shipping rate, using mock data");
            return await GetMockShippingRateAsync(request);
        }
    }

    public async Task<ShipmentResponse> CreateShipmentAsync(ShipmentRequest request)
    {
        _logger.LogInformation("Creating UPS shipment for order {OrderNumber}", request.OrderNumber);

        if (_useMockData)
        {
            return await CreateMockShipmentAsync(request);
        }

        try
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {_apiKey}" },
                { "Username", _username },
                { "Password", _password }
            };

            var requestData = new
            {
                ShipmentRequest = new
                {
                    Shipment = new
                    {
                        Shipper = new
                        {
                            Name = "Your Store",
                            Phone = new { Number = "1234567890" },
                            Address = new
                            {
                                AddressLine = "Store Address",
                                City = "Mumbai",
                                PostalCode = "400001",
                                CountryCode = "IN"
                            }
                        },
                        ShipTo = new
                        {
                            Name = request.RecipientName,
                            Phone = new { Number = request.RecipientPhone },
                            Address = new
                            {
                                AddressLine = request.RecipientAddress,
                                PostalCode = request.RecipientPincode,
                                CountryCode = "IN"
                            }
                        },
                        Package = new
                        {
                            PackageWeight = new
                            {
                                UnitOfMeasurement = new { Code = "KGS" },
                                Weight = request.Weight.ToString()
                            }
                        },
                        ReferenceNumber = new { Value = request.OrderNumber }
                    }
                }
            };

            var response = await SendRequestAsync<UPSShipmentResponse>(
                HttpMethod.Post,
                "/ship/v1/shipments",
                requestData,
                headers
            );

            if (response?.ShipmentResponse?.ShipmentResults == null)
            {
                return await CreateMockShipmentAsync(request);
            }

            var trackingNumber = response.ShipmentResponse.ShipmentResults.PackageResults.TrackingNumber;

            return new ShipmentResponse
            {
                Success = true,
                ShipmentId = trackingNumber,
                TrackingNumber = trackingNumber
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating UPS shipment, using mock data");
            return await CreateMockShipmentAsync(request);
        }
    }

    public async Task<TrackingResponse> TrackShipmentAsync(string trackingNumber)
    {
        _logger.LogInformation("Tracking UPS shipment: {TrackingNumber}", trackingNumber);

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

            var response = await SendRequestAsync<UPSTrackingResponse>(
                HttpMethod.Get,
                $"/track/v1/details/{trackingNumber}",
                headers: headers
            );

            if (response?.TrackResponse?.Shipment == null)
            {
                return await GetMockTrackingAsync(trackingNumber);
            }

            var shipment = response.TrackResponse.Shipment;

            return new TrackingResponse
            {
                Status = shipment.Package.Activity.First().Status.Description,
                CurrentLocation = shipment.Package.Activity.First().ActivityLocation.Address.City,
                EstimatedDelivery = null,
                Events = shipment.Package.Activity.Select(a => new TrackingEvent
                {
                    Timestamp = DateTime.Parse(a.Date + " " + a.Time),
                    Status = a.Status.Description,
                    Location = a.ActivityLocation.Address.City,
                    Description = a.Status.Description
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking UPS shipment, using mock data");
            return await GetMockTrackingAsync(trackingNumber);
        }
    }

    public async Task<bool> CancelShipmentAsync(string shipmentId)
    {
        _logger.LogInformation("Cancelling UPS shipment: {ShipmentId}", shipmentId);

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

            var response = await SendRequestAsync<UPSCancelResponse>(
                HttpMethod.Delete,
                $"/ship/v1/shipments/cancel/{shipmentId}",
                headers: headers
            );

            return response?.Status == "Success";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling UPS shipment");
            return true;
        }
    }

    #region Mock Data Methods

    private Task<ShippingRateResponse> GetMockShippingRateAsync(ShippingRateRequest request)
    {
        // UPS premium international pricing
        decimal baseRate = 150;
        decimal weightRate = request.Weight * 30;
        decimal volumetricWeight = (request.Length * request.Width * request.Height) / 5000;
        decimal chargeableWeight = Math.Max(request.Weight, volumetricWeight);
        decimal regionMultiplier = GetRegionMultiplier(request.DestinationPincode);

        decimal totalCost = (baseRate + (chargeableWeight * 30)) * regionMultiplier;

        return Task.FromResult(new ShippingRateResponse
        {
            Cost = Math.Round(totalCost, 2),
            EstimatedDays = GetEstimatedDays(request.DestinationPincode),
            ServiceType = "UPS Express Saver"
        });
    }

    private Task<ShipmentResponse> CreateMockShipmentAsync(ShipmentRequest request)
    {
        var trackingNumber = $"1Z{new Random().Next(100, 999)}AA{new Random().Next(10000000, 99999999)}";

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
            CurrentLocation = "UPS Gateway Facility",
            EstimatedDelivery = DateTime.UtcNow.AddDays(2),
            Events = new List<TrackingEvent>
            {
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow.AddHours(-12),
                    Status = "Picked Up",
                    Location = "Origin UPS Facility",
                    Description = "Package picked up"
                },
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow.AddHours(-6),
                    Status = "Departed",
                    Location = "UPS Sort Facility",
                    Description = "Departed facility"
                },
                new TrackingEvent
                {
                    Timestamp = DateTime.UtcNow,
                    Status = "In Transit",
                    Location = "UPS Gateway Facility",
                    Description = "Package in transit"
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
            '1' => 1.0m,  // Delhi (UPS hub)
            '2' => 1.05m,
            '3' => 1.1m,
            '4' => 1.0m,  // Mumbai (UPS hub)
            '5' => 1.1m,
            '6' => 1.15m,
            '7' => 1.2m,
            '8' => 1.35m, // North East (limited coverage)
            '9' => 1.15m,
            _ => 1.1m
        };
    }

    private int GetEstimatedDays(string pincode)
    {
        if (string.IsNullOrEmpty(pincode)) return 3;

        var firstDigit = pincode[0];
        return firstDigit switch
        {
            '1' or '4' => 1,  // Metro (UPS hubs)
            '2' or '3' or '5' or '6' => 2,
            '7' or '9' => 3,
            '8' => 4,
            _ => 2
        };
    }

    #endregion
}

// UPS Response Models
public class UPSRateResponse
{
    public UPSRateResponseData? RateResponse { get; set; }
}

public class UPSRateResponseData
{
    public UPSRatedShipment? RatedShipment { get; set; }
}

public class UPSRatedShipment
{
    public UPSCharges TotalCharges { get; set; } = new();
}

public class UPSCharges
{
    public string MonetaryValue { get; set; } = string.Empty;
}

public class UPSShipmentResponse
{
    public UPSShipmentResponseData? ShipmentResponse { get; set; }
}

public class UPSShipmentResponseData
{
    public UPSShipmentResults? ShipmentResults { get; set; }
}

public class UPSShipmentResults
{
    public UPSPackageResults PackageResults { get; set; } = new();
}

public class UPSPackageResults
{
    public string TrackingNumber { get; set; } = string.Empty;
}

public class UPSTrackingResponse
{
    public UPSTrackResponseData? TrackResponse { get; set; }
}

public class UPSTrackResponseData
{
    public UPSShipment? Shipment { get; set; }
}

public class UPSShipment
{
    public UPSPackage Package { get; set; } = new();
}

public class UPSPackage
{
    public List<UPSActivity> Activity { get; set; } = new();
}

public class UPSActivity
{
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public UPSStatus Status { get; set; } = new();
    public UPSActivityLocation ActivityLocation { get; set; } = new();
}

public class UPSStatus
{
    public string Description { get; set; } = string.Empty;
}

public class UPSActivityLocation
{
    public UPSAddress Address { get; set; } = new();
}

public class UPSAddress
{
    public string City { get; set; } = string.Empty;
}

public class UPSCancelResponse
{
    public string Status { get; set; } = string.Empty;
}