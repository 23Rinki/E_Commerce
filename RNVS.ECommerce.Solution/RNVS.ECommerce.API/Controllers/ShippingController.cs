using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ShippingController : ControllerBase
{
    private readonly IEnumerable<IShippingProvider> _shippingProviders;
    private readonly ILogger<ShippingController> _logger;

    public ShippingController(
        IEnumerable<IShippingProvider> shippingProviders,
        ILogger<ShippingController> logger)
    {
        _shippingProviders = shippingProviders;
        _logger = logger;
    }

    /// <summary>
    /// Get shipping rates from all available providers
    /// </summary>
    [HttpPost("rates")]
    public async Task<IActionResult> GetShippingRates([FromBody] ShippingRateRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid input",
                    Errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                });
            }

            var rateRequest = new ShippingRateRequest
            {
                OriginPincode = request.OriginPincode ?? "000000",
                DestinationPincode = request.DestinationPincode,
                Weight = request.Weight,
                Length = request.Length,
                Width = request.Width,
                Height = request.Height
            };

            var rates = new List<ShippingRateDto>();

            foreach (var provider in _shippingProviders)
            {
                try
                {
                    var rate = await provider.GetShippingRateAsync(rateRequest);
                    rates.Add(new ShippingRateDto
                    {
                        ProviderName = provider.ProviderName,
                        Cost = rate.Cost,
                        EstimatedDays = rate.EstimatedDays,
                        ServiceType = rate.ServiceType
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get rate from {Provider}", provider.ProviderName);
                }
            }

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    Providers = rates.OrderBy(r => r.Cost).ToList()
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shipping rates");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Create shipment with chosen provider
    /// </summary>
    [HttpPost("create")]
    [Authorize(Roles = "Admin,SuperAdmin,Vendor")]
    public async Task<IActionResult> CreateShipment([FromBody] CreateShipmentDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid input",
                    Errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                });
            }

            var provider = _shippingProviders.FirstOrDefault(p =>
                p.ProviderName.Equals(request.ProviderName, StringComparison.OrdinalIgnoreCase));

            if (provider == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = $"Shipping provider '{request.ProviderName}' not found"
                });
            }

            var shipmentRequest = new ShipmentRequest
            {
                OrderNumber = request.OrderNumber,
                RecipientName = request.RecipientName,
                RecipientPhone = request.RecipientPhone,
                RecipientAddress = request.RecipientAddress,
                RecipientPincode = request.RecipientPincode,
                Weight = request.Weight,
                DeclaredValue = request.DeclaredValue
            };

            var response = await provider.CreateShipmentAsync(shipmentRequest);

            if (!response.Success)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = response.ErrorMessage ?? "Failed to create shipment"
                });
            }

            _logger.LogInformation("Shipment created with {Provider}: {TrackingNumber}",
                provider.ProviderName, response.TrackingNumber);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Shipment created successfully",
                Data = new
                {
                    ShipmentId = response.ShipmentId,
                    TrackingNumber = response.TrackingNumber,
                    Provider = provider.ProviderName
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating shipment");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Track shipment by tracking number
    /// </summary>
    [HttpGet("track/{trackingNumber}")]
    public async Task<IActionResult> TrackShipment(string trackingNumber, [FromQuery] string? providerName = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(trackingNumber))
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Tracking number is required"
                });
            }

            // If provider specified, use that provider only
            if (!string.IsNullOrWhiteSpace(providerName))
            {
                var provider = _shippingProviders.FirstOrDefault(p =>
                    p.ProviderName.Equals(providerName, StringComparison.OrdinalIgnoreCase));

                if (provider == null)
                {
                    return NotFound(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = $"Shipping provider '{providerName}' not found"
                    });
                }

                var tracking = await provider.TrackShipmentAsync(trackingNumber);
                return Ok(new ApiResponseDto<object>
                {
                    Success = true,
                    Data = new
                    {
                        Provider = provider.ProviderName,
                        TrackingNumber = trackingNumber,
                        Status = tracking.Status,
                        CurrentLocation = tracking.CurrentLocation,
                        EstimatedDelivery = tracking.EstimatedDelivery,
                        Events = tracking.Events
                    }
                });
            }

            // Try all providers
            foreach (var provider in _shippingProviders)
            {
                try
                {
                    var tracking = await provider.TrackShipmentAsync(trackingNumber);
                    if (!string.IsNullOrWhiteSpace(tracking.Status))
                    {
                        return Ok(new ApiResponseDto<object>
                        {
                            Success = true,
                            Data = new
                            {
                                Provider = provider.ProviderName,
                                TrackingNumber = trackingNumber,
                                Status = tracking.Status,
                                CurrentLocation = tracking.CurrentLocation,
                                EstimatedDelivery = tracking.EstimatedDelivery,
                                Events = tracking.Events
                            }
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to track with {Provider}", provider.ProviderName);
                }
            }

            return NotFound(new ApiResponseDto<object>
            {
                Success = false,
                Message = "Tracking information not found"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking shipment");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Cancel shipment
    /// </summary>
    [HttpPost("cancel/{shipmentId}")]
    [Authorize(Roles = "Admin,SuperAdmin,Vendor")]
    public async Task<IActionResult> CancelShipment(string shipmentId, [FromQuery] string providerName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(providerName))
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Provider name is required"
                });
            }

            var provider = _shippingProviders.FirstOrDefault(p =>
                p.ProviderName.Equals(providerName, StringComparison.OrdinalIgnoreCase));

            if (provider == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = $"Shipping provider '{providerName}' not found"
                });
            }

            var result = await provider.CancelShipmentAsync(shipmentId);

            if (!result)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Failed to cancel shipment"
                });
            }

            _logger.LogInformation("Shipment {ShipmentId} cancelled with {Provider}",
                shipmentId, provider.ProviderName);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Shipment cancelled successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling shipment");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get list of available shipping providers
    /// </summary>
    [HttpGet("providers")]
    public IActionResult GetProviders()
    {
        try
        {
            var providers = _shippingProviders.Select(p => new
            {
                Name = p.ProviderName
            }).ToList();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = providers
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting providers");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }
}

// DTOs
public class ShippingRateRequestDto
{
    public string? OriginPincode { get; set; }
    public string DestinationPincode { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal Length { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
}

public class ShippingRateDto
{
    public string ProviderName { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public int EstimatedDays { get; set; }
    public string ServiceType { get; set; } = string.Empty;
}

public class CreateShipmentDto
{
    public string ProviderName { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string RecipientAddress { get; set; } = string.Empty;
    public string RecipientPincode { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal DeclaredValue { get; set; }
}
