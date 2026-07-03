using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Domain.Entities.Vendor;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly VendorDbContext _vendorContext;
    private readonly ILogger<UsersController> _logger;
    private readonly UserManager<ApplicationUser> _userManager;

    public UsersController(
        ApplicationDbContext context,
        VendorDbContext vendorContext,
        ILogger<UsersController> logger,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _vendorContext = vendorContext;
        _logger = logger;
        _userManager = userManager;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new ApiResponseDto<object> { Success = false, Message = "User not authenticated" });

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    user.Id,
                    user.UserName,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.PhoneNumber,
                    user.GstNumber,
                    user.Role,
                    user.IsActive,
                    user.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateCustomerProfileRequest model)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new ApiResponseDto<object> { Success = false, Message = "User not authenticated" });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            user.FirstName   = model.FirstName?.Trim() ?? user.FirstName;
            user.LastName    = model.LastName?.Trim()  ?? user.LastName;
            user.PhoneNumber = model.PhoneNumber?.Trim();
            user.GstNumber   = string.IsNullOrWhiteSpace(model.GstNumber) ? null : model.GstNumber.Trim().ToUpper();

            await _userManager.UpdateAsync(user);
            return Ok(new ApiResponseDto<object> { Success = true, Message = "Profile updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("view-history")]
    public async Task<IActionResult> GetViewHistory()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new ApiResponseDto<object> { Success = false, Message = "User not authenticated" });

            var history = await _vendorContext.ProductViewHistories
                .Where(h => h.UserId == userId)
                .OrderByDescending(h => h.ViewedAt)
                .Take(50)
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = history });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting view history");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("behaviors")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetUserBehaviors()
    {
        try
        {
            var behaviors = await _vendorContext.UserBehaviors.ToListAsync();
            return Ok(new ApiResponseDto<object> { Success = true, Data = behaviors });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting behaviors");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            var users = await _context.Users
                .Select(u => new
                {
                    u.Id,
                    u.UserName,
                    u.Email,
                    u.FirstName,
                    u.LastName,
                    u.Role,
                    u.IsActive,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = users });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting users");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get user details with addresses (Admin only)
    /// </summary>
    [HttpGet("{userId}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetUserById(string userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            var addresses = await _vendorContext.Addresses
                .Where(a => a.UserId == userId)
                .Select(a => new
                {
                    a.Id,
                    a.FirstName,
                    a.LastName,
                    a.Street,
                    a.City,
                    a.State,
                    a.PostalCode,
                    a.Country,
                    a.IsDefault
                })
                .ToListAsync();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    User = new
                    {
                        user.Id,
                        user.UserName,
                        user.Email,
                        user.FirstName,
                        user.LastName,
                        user.PhoneNumber,
                        user.Role,
                        user.IsActive,
                        user.CreatedAt
                    },
                    Addresses = addresses
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user by ID");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // ── GET /api/users/vendor-profile ───────────────────────────────────────
    [HttpGet("vendor-profile")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> GetVendorProfile()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            var tenant = await _context.TenantRegistrations.FirstOrDefaultAsync(t => t.VendorId == userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    user.FirstName,
                    user.LastName,
                    user.Email,
                    user.PhoneNumber,
                    user.CreatedAt,
                    StoreName             = tenant?.StoreName,
                    Status                = tenant?.Status.ToString(),
                    UdyamCertificateNumber = tenant?.UdyamCertificateNumber,
                    CompanyPanNumber      = tenant?.CompanyPanNumber,
                    GstNumber             = tenant?.GstNumber,
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting vendor profile");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // ── PUT /api/users/vendor-profile ───────────────────────────────────────
    [HttpPut("vendor-profile")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> UpdateVendorProfile([FromBody] UpdateVendorProfileRequest model)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);
            if (user == null) return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            // Update ApplicationUser
            user.FirstName   = model.FirstName.Trim();
            user.LastName    = model.LastName.Trim();
            user.PhoneNumber = model.PhoneNumber?.Trim();
            await _userManager.UpdateAsync(user);

            // Update TenantRegistration in main DB
            var tenant = await _context.TenantRegistrations.FirstOrDefaultAsync(t => t.VendorId == userId);
            if (tenant != null)
            {
                tenant.StoreName              = model.StoreName?.Trim() ?? tenant.StoreName;
                tenant.UdyamCertificateNumber = model.UdyamCertificateNumber?.Trim().ToUpper();
                tenant.CompanyPanNumber       = model.CompanyPanNumber?.Trim().ToUpper();
                tenant.GstNumber              = string.IsNullOrWhiteSpace(model.GstNumber) ? null : model.GstNumber.Trim().ToUpper();
                tenant.UpdatedAt              = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Mirror business fields into vendor DB CompanyProfile
                try
                {
                    var connStr = tenant.RailwayDatabaseUrl
                        ?? _context.Database.GetConnectionString();

                    var opts = new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<VendorDbContext>()
                        .UseNpgsql(connStr)
                        .Options;
                    await using var vendorCtx = new VendorDbContext(opts);

                    var profile = await vendorCtx.CompanyProfiles.FirstOrDefaultAsync(p => p.VendorId == userId);
                    if (profile != null)
                    {
                        profile.CompanyName            = model.StoreName?.Trim() ?? profile.CompanyName;
                        profile.FirstName              = model.FirstName.Trim();
                        profile.LastName               = model.LastName.Trim();
                        profile.PhoneNumber            = model.PhoneNumber?.Trim();
                        profile.UdyamCertificateNumber = tenant.UdyamCertificateNumber;
                        profile.CompanyPanNumber       = tenant.CompanyPanNumber;
                        profile.GstNumber              = tenant.GstNumber;
                        await vendorCtx.SaveChangesAsync();
                    }
                }
                catch (Exception vpEx)
                {
                    _logger.LogWarning(vpEx, "Vendor DB profile sync failed for {UserId} — main DB updated", userId);
                }
            }

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Profile updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating vendor profile");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get user's addresses (Admin only)
    /// </summary>
    [HttpGet("{userId}/addresses")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetUserAddresses(string userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            var addresses = await _vendorContext.Addresses
                .Where(a => a.UserId == userId)
                .Select(a => new
                {
                    a.Id,
                    a.FirstName,
                    a.LastName,
                    FullName = a.FirstName + " " + a.LastName,
                    a.Street,
                    a.City,
                    a.State,
                    a.PostalCode,
                    a.Country,
                    a.IsDefault
                })
                .ToListAsync();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    UserId = userId,
                    UserName = user.UserName,
                    UserEmail = user.Email,
                    Addresses = addresses
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user addresses");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // ── GET /api/users/bank-account ─────────────────────────────────────────
    [HttpGet("bank-account")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> GetBankAccount()
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var account = await _context.VendorBankAccounts
                .FirstOrDefaultAsync(a => a.VendorId == vendorId);

            if (account == null)
                return Ok(new ApiResponseDto<object> { Success = true, Data = null });

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    account.Id,
                    account.AccountHolderName,
                    account.BankName,
                    // Mask all but last 4 digits
                    AccountNumber = account.AccountNumber.Length > 4
                        ? new string('*', account.AccountNumber.Length - 4) + account.AccountNumber[^4..]
                        : account.AccountNumber,
                    AccountNumberFull = account.AccountNumber,
                    account.IfscCode,
                    account.AccountType,
                    account.UpiId,
                    account.IsVerified,
                    account.CreatedAt,
                    account.UpdatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting bank account");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // ── POST /api/users/bank-account ────────────────────────────────────────
    [HttpPost("bank-account")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> SaveBankAccount([FromBody] SaveBankAccountRequest model)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var existing = await _context.VendorBankAccounts
                .FirstOrDefaultAsync(a => a.VendorId == vendorId);

            if (existing == null)
            {
                var account = new VendorBankAccount
                {
                    VendorId            = vendorId!,
                    AccountHolderName   = model.AccountHolderName.Trim(),
                    BankName            = model.BankName.Trim(),
                    AccountNumber       = model.AccountNumber.Trim(),
                    IfscCode            = model.IfscCode.Trim().ToUpper(),
                    AccountType         = model.AccountType,
                    UpiId               = string.IsNullOrWhiteSpace(model.UpiId) ? null : model.UpiId.Trim(),
                    IsVerified          = false,
                };
                _context.VendorBankAccounts.Add(account);
            }
            else
            {
                existing.AccountHolderName = model.AccountHolderName.Trim();
                existing.BankName          = model.BankName.Trim();
                existing.AccountNumber     = model.AccountNumber.Trim();
                existing.IfscCode          = model.IfscCode.Trim().ToUpper();
                existing.AccountType       = model.AccountType;
                existing.UpiId             = string.IsNullOrWhiteSpace(model.UpiId) ? null : model.UpiId.Trim();
                existing.IsVerified        = false; // reset verification on any change
                existing.UpdatedAt         = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponseDto<object> { Success = true, Message = "Bank account saved. Verification pending." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving bank account");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}

public class UpdateVendorProfileRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? StoreName { get; set; }
    public string? UdyamCertificateNumber { get; set; }
    public string? CompanyPanNumber { get; set; }
    public string? GstNumber { get; set; }
}

public class SaveBankAccountRequest
{
    public string AccountHolderName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string IfscCode { get; set; } = string.Empty;
    public string AccountType { get; set; } = "Savings";
    public string? UpiId { get; set; }
}

public class UpdateCustomerProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? GstNumber { get; set; }
}
