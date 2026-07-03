using Microsoft.AspNetCore.Authorization;
using RNVS.ECommerce.API.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequireAccess("receipts")]
public class CustomReceiptsController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<CustomReceiptsController> _logger;

    public CustomReceiptsController(VendorDbContext context, ILogger<CustomReceiptsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetReceipts()
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var receipts = await _context.CustomReceipts.Where(r => r.VendorId == vendorId).ToListAsync();
            return Ok(new ApiResponseDto<object> { Success = true, Data = receipts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting custom receipts");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetReceipt(int id)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var receipt = await _context.CustomReceipts.FindAsync(id);
            if (receipt == null || receipt.VendorId != vendorId)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Receipt not found" });

            return Ok(new ApiResponseDto<object> { Success = true, Data = receipt });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting custom receipt");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}
