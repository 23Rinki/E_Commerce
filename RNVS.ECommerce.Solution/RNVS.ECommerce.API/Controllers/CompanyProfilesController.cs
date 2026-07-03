using Microsoft.AspNetCore.Authorization;
using RNVS.ECommerce.API.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequireAccess("settings")]
public class CompanyProfilesController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<CompanyProfilesController> _logger;

    public CompanyProfilesController(VendorDbContext context, ILogger<CompanyProfilesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            var profile = await _context.CompanyProfiles.FirstOrDefaultAsync();
            return Ok(new ApiResponseDto<object> { Success = true, Data = profile });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting company profile");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPut]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateProfile([FromBody] object profile)
    {
        try
        {
            var existing = await _context.CompanyProfiles.FirstOrDefaultAsync();
            if (existing != null)
            {
                _context.CompanyProfiles.Update(existing);
                await _context.SaveChangesAsync();
            }

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Profile updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating company profile");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}
