using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class EmailQueuesController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<EmailQueuesController> _logger;

    public EmailQueuesController(VendorDbContext context, ILogger<EmailQueuesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetEmails()
    {
        try
        {
            var emails = await _context.EmailQueues
                .OrderByDescending(e => e.CreatedAt)
                .Take(100)
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = emails });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting email queue");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingEmails()
    {
        try
        {
            var emails = await _context.EmailQueues
                .Where(e => e.Status == Domain.Enums.EmailStatus.Pending)
                .OrderBy(e => e.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = emails });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending emails");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}
