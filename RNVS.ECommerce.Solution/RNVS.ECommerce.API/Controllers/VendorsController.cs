using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VendorsController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<VendorsController> _logger;

    public VendorsController(VendorDbContext context, ILogger<VendorsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("payouts")]
    [Authorize(Roles = "Admin,SuperAdmin,Vendor")]
    public async Task<IActionResult> GetPayouts()
    {
        try
        {
            var payouts = await _context.VendorPayouts
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = payouts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payouts");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("payouts/{id}")]
    [Authorize(Roles = "Admin,SuperAdmin,Vendor")]
    public async Task<IActionResult> GetPayoutById(int id)
    {
        try
        {
            var payout = await _context.VendorPayouts.FindAsync(id);
            if (payout == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Payout not found" });

            var items = await _context.VendorPayoutItems.Where(i => i.PayoutId == id).ToListAsync();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new { Payout = payout, Items = items }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payout");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("payouts/vendor/{vendorId}")]
    [Authorize(Roles = "Admin,SuperAdmin,Vendor")]
    public async Task<IActionResult> GetPayoutsByVendor(string vendorId)
    {
        try
        {
            var payouts = await _context.VendorPayouts
                .Where(p => p.VendorId == vendorId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = payouts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting vendor payouts");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}
