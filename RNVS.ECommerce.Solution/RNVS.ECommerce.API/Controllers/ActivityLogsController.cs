using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class ActivityLogsController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<ActivityLogsController> _logger;

    public ActivityLogsController(VendorDbContext context, ILogger<ActivityLogsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetLogs()
    {
        try
        {
            var logs = await _context.ActivityLogs
                .OrderByDescending(l => l.CreatedAt)
                .Take(100)
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = logs });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting activity logs");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetLogsByUser(string userId)
    {
        try
        {
            var logs = await _context.ActivityLogs
                .Where(l => l.UserId == userId)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = logs });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user logs");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}
