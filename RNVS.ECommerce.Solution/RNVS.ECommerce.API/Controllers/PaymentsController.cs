using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.DTOs.Payment;
using RNVS.ECommerce.Application.DTOs.PaymentMethod;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;
using PaymentMethodEntity = RNVS.ECommerce.Domain.Entities.Payment.PaymentMethod;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly VendorDbContext _vendorContext;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        ApplicationDbContext context,
        VendorDbContext vendorContext,
        ILogger<PaymentsController> logger)
    {
        _context = context;
        _vendorContext = vendorContext;
        _logger = logger;
    }

    /// <summary>
    /// Get payment methods for current user
    /// </summary>
    [HttpGet("methods")]
    public async Task<IActionResult> GetPaymentMethods()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var paymentMethods = await _vendorContext.PaymentMethods
                .Where(pm => pm.UserId == userId)
                .OrderByDescending(pm => pm.IsDefault)
                .ToListAsync();

            var dtos = paymentMethods.Select(pm => new PaymentMethodDto
            {
                Id = pm.Id,
                UserId = pm.UserId,
                Type = pm.Type,
                LastFourDigits = pm.LastFourDigits,
                BrandName = pm.BrandName,
                IsDefault = pm.IsDefault,
                CreatedAt = pm.CreatedAt
            }).ToList();

            return Ok(new ApiResponseDto<List<PaymentMethodDto>>
            {
                Success = true,
                Data = dtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment methods");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Add payment method
    /// </summary>
    [HttpPost("methods")]
    public async Task<IActionResult> AddPaymentMethod([FromBody] CreatePaymentMethodDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid input",
                    Errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            if (dto.IsDefault)
            {
                var existingDefaults = await _vendorContext.PaymentMethods
                    .Where(pm => pm.UserId == userId && pm.IsDefault)
                    .ToListAsync();
                foreach (var pm in existingDefaults)
                {
                    pm.IsDefault = false;
                }
            }

            var paymentMethod = new PaymentMethodEntity
            {
                UserId = userId,
                Type = dto.Type,
                LastFourDigits = dto.LastFourDigits,
                BrandName = dto.BrandName,
                IsDefault = dto.IsDefault,
                CreatedAt = DateTime.UtcNow
            };

            await _vendorContext.PaymentMethods.AddAsync(paymentMethod);
            await _vendorContext.SaveChangesAsync();

            _logger.LogInformation("Payment method added for user {UserId}", userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Payment method added successfully",
                Data = new { PaymentMethodId = paymentMethod.Id }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding payment method");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Delete payment method
    /// </summary>
    [HttpDelete("methods/{id}")]
    public async Task<IActionResult> DeletePaymentMethod(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var paymentMethod = await _vendorContext.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == id && pm.UserId == userId);

            if (paymentMethod == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Payment method not found"
                });
            }

            _vendorContext.PaymentMethods.Remove(paymentMethod);
            await _vendorContext.SaveChangesAsync();

            _logger.LogInformation("Payment method {Id} deleted", id);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Payment method deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting payment method");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get payment by order ID
    /// </summary>
    [HttpGet("order/{orderId}")]
    public async Task<IActionResult> GetPaymentByOrderId(int orderId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var order = await _vendorContext.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null || order.UserId != userId)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Order not found"
                });
            }

            var payment = await _vendorContext.Payments.FirstOrDefaultAsync(p => p.OrderId == orderId);
            if (payment == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Payment not found"
                });
            }

            var dto = new PaymentDto
            {
                Id = payment.Id,
                OrderId = payment.OrderId,
                Amount = payment.Amount,
                Method = (int)payment.Method,
                Status = (int)payment.Status,
                TransactionId = payment.TransactionId,
                CreatedAt = payment.CreatedAt,
                ProcessedAt = payment.ProcessedAt
            };

            return Ok(new ApiResponseDto<PaymentDto>
            {
                Success = true,
                Data = dto
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment for order {OrderId}", orderId);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get all payments for current user
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetPayments()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var orderIds = await _vendorContext.Orders
                .Where(o => o.UserId == userId)
                .Select(o => o.Id)
                .ToListAsync();

            var payments = await _vendorContext.Payments
                .Where(p => orderIds.Contains(p.OrderId))
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var dtos = payments.Select(p => new PaymentDto
            {
                Id = p.Id,
                OrderId = p.OrderId,
                Amount = p.Amount,
                Method = (int)p.Method,
                Status = (int)p.Status,
                TransactionId = p.TransactionId,
                CreatedAt = p.CreatedAt,
                ProcessedAt = p.ProcessedAt
            }).ToList();

            return Ok(new ApiResponseDto<List<PaymentDto>>
            {
                Success = true,
                Data = dtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payments");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }
}
