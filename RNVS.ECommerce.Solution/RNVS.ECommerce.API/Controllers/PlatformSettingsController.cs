using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.System;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

// No class-level [Authorize] — each action sets its own required role(s) below. A class-level
// [Authorize(Roles=...)] combined with a method-level [Authorize(Roles=...)] is ANDed, not ORed,
// so vendor endpoints here previously required a user to be simultaneously Vendor AND
// Admin/SuperAdmin — impossible for anyone, meaning saving vendor settings has always 403'd.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PlatformSettingsController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<PlatformSettingsController> _logger;

    // Vendors cannot override commission — that is admin-controlled
    private static readonly HashSet<string> AdminOnlyKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "CommissionRate"
    };

    public PlatformSettingsController(VendorDbContext context, ILogger<PlatformSettingsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── Vendor endpoints ─────────────────────────────────────────────────────

    /// <summary>Get all settings for the current vendor</summary>
    [HttpGet("vendor/mine")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> GetMySettings()
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var settings = await _context.PlatformSettings
                .Where(s => s.VendorId == vendorId)
                .ToListAsync();

            return Ok(new ApiResponseDto<List<PlatformSetting>> { Success = true, Data = settings });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting vendor settings");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    /// <summary>
    /// Upsert a setting for the current vendor.
    /// Creates the row if it does not exist yet, updates it if it does.
    /// CommissionRate is blocked — only admin can set that.
    /// </summary>
    [HttpPut("vendor/{key}")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> UpsertMySettings(string key, [FromBody] UpdatePlatformSettingDto dto)
    {
        try
        {
            if (AdminOnlyKeys.Contains(key))
                return Forbid();

            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var existing = await _context.PlatformSettings
                .FirstOrDefaultAsync(s => s.Key == key && s.VendorId == vendorId);

            if (existing != null)
            {
                existing.Value = dto.Value;
                if (!string.IsNullOrEmpty(dto.Description))
                    existing.Description = dto.Description;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var setting = new PlatformSetting
                {
                    Key = key,
                    Value = dto.Value,
                    Description = dto.Description,
                    Category = "General",
                    DataType = SettingDataType.String,
                    VendorId = vendorId,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.PlatformSettings.Add(setting);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Vendor {VendorId} updated setting {Key}", vendorId, key);

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Setting saved successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting vendor setting {Key}", key);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    /// <summary>
    /// Seed default settings for a vendor on first setup.
    /// Safe to call multiple times — skips keys that already exist for this vendor.
    /// </summary>
    [HttpPost("vendor/initialize")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> InitializeMySettings()
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var existingKeys = await _context.PlatformSettings
                .Where(s => s.VendorId == vendorId)
                .Select(s => s.Key)
                .ToHashSetAsync();

            var defaults = new List<PlatformSetting>
            {
                new() { Key = "StoreName",             Value = "My Store",          Description = "Store display name",                    Category = "Store",    DataType = SettingDataType.String,  VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "StoreEmail",            Value = "",                  Description = "Store contact email",                   Category = "Store",    DataType = SettingDataType.String,  VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "StorePhone",            Value = "",                  Description = "Store contact phone",                   Category = "Store",    DataType = SettingDataType.String,  VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "TaxRate",               Value = "0.18",              Description = "Tax rate (0.18 = 18%)",                 Category = "Finance",  DataType = SettingDataType.Decimal, VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "Currency",              Value = "INR",               Description = "Currency code",                         Category = "Finance",  DataType = SettingDataType.String,  VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "CurrencySymbol",        Value = "₹",                 Description = "Currency symbol",                       Category = "Finance",  DataType = SettingDataType.String,  VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "TimeZone",              Value = "Asia/Kolkata",      Description = "Store timezone",                        Category = "General",  DataType = SettingDataType.String,  VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "EnableReviews",         Value = "true",              Description = "Enable product reviews",                Category = "Features", DataType = SettingDataType.Boolean, VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "MinOrderAmount",        Value = "0",                 Description = "Minimum order amount",                  Category = "Orders",   DataType = SettingDataType.Decimal, VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "FreeShippingThreshold", Value = "1000",              Description = "Free shipping above this order amount (0 = always charge)", Category = "Shipping", DataType = SettingDataType.Decimal, VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
                new() { Key = "ShippingFlatRate",      Value = "50",                Description = "Flat shipping charge below the free-shipping threshold", Category = "Shipping", DataType = SettingDataType.Decimal, VendorId = vendorId, UpdatedAt = DateTime.UtcNow },
            };

            var toAdd = defaults.Where(d => !existingKeys.Contains(d.Key)).ToList();
            if (toAdd.Any())
            {
                await _context.PlatformSettings.AddRangeAsync(toAdd);
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Vendor {VendorId} initialized {Count} settings", vendorId, toAdd.Count);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = $"{toAdd.Count} settings initialized",
                Data = toAdd.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing vendor settings");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetSettings()
    {
        try
        {
            var settings = await _context.PlatformSettings.ToListAsync();
            return Ok(new ApiResponseDto<object> { Success = true, Data = settings });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting platform settings");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("{key}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetSetting(string key)
    {
        try
        {
            var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Setting not found" });

            return Ok(new ApiResponseDto<object> { Success = true, Data = setting });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting platform setting");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateSetting([FromBody] CreatePlatformSettingDto dto)
    {
        try
        {
            var existing = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == dto.Key);
            if (existing != null)
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Setting with this key already exists" });

            var setting = new PlatformSetting
            {
                Key = dto.Key,
                Value = dto.Value,
                Description = dto.Description,
                Category = dto.Category ?? "General",
                DataType = dto.DataType,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PlatformSettings.Add(setting);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Platform setting created: {Key}", dto.Key);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Setting created successfully",
                Data = setting
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating platform setting");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPut("{key}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdatePlatformSettingDto dto)
    {
        try
        {
            var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Setting not found" });

            setting.Value = dto.Value;
            if (!string.IsNullOrEmpty(dto.Description))
                setting.Description = dto.Description;
            setting.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Platform setting updated: {Key}", key);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Setting updated successfully",
                Data = setting
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating platform setting");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpDelete("{key}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeleteSetting(string key)
    {
        try
        {
            var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Setting not found" });

            _context.PlatformSettings.Remove(setting);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Platform setting deleted: {Key}", key);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Setting deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting platform setting");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPost("initialize")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> InitializeDefaultSettings()
    {
        try
        {
            var existingCount = await _context.PlatformSettings.CountAsync();
            if (existingCount > 0)
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Settings already initialized" });

            var defaultSettings = new List<PlatformSetting>
            {
                new() { Key = "StoreName", Value = "My E-Commerce Store", Description = "Store display name", Category = "Store", DataType = SettingDataType.String, UpdatedAt = DateTime.UtcNow },
                new() { Key = "StoreEmail", Value = "store@example.com", Description = "Store contact email", Category = "Store", DataType = SettingDataType.String, UpdatedAt = DateTime.UtcNow },
                new() { Key = "StorePhone", Value = "+91-1234567890", Description = "Store contact phone", Category = "Store", DataType = SettingDataType.String, UpdatedAt = DateTime.UtcNow },
                new() { Key = "CommissionRate", Value = "0.0", Description = "Platform commission rate — none for now (0 = 0%)", Category = "Finance", DataType = SettingDataType.Decimal, UpdatedAt = DateTime.UtcNow },
                new() { Key = "TaxRate", Value = "0.18", Description = "Default tax rate (0.18 = 18% GST)", Category = "Finance", DataType = SettingDataType.Decimal, UpdatedAt = DateTime.UtcNow },
                new() { Key = "Currency", Value = "INR", Description = "Default currency code", Category = "Finance", DataType = SettingDataType.String, UpdatedAt = DateTime.UtcNow },
                new() { Key = "CurrencySymbol", Value = "₹", Description = "Currency symbol", Category = "Finance", DataType = SettingDataType.String, UpdatedAt = DateTime.UtcNow },
                new() { Key = "TimeZone", Value = "Asia/Kolkata", Description = "Store timezone", Category = "General", DataType = SettingDataType.String, UpdatedAt = DateTime.UtcNow },
                new() { Key = "EnableGuestCheckout", Value = "true", Description = "Allow guest checkout", Category = "Features", DataType = SettingDataType.Boolean, UpdatedAt = DateTime.UtcNow },
                new() { Key = "EnableWishlist", Value = "true", Description = "Enable wishlist feature", Category = "Features", DataType = SettingDataType.Boolean, UpdatedAt = DateTime.UtcNow },
                new() { Key = "EnableReviews", Value = "true", Description = "Enable product reviews", Category = "Features", DataType = SettingDataType.Boolean, UpdatedAt = DateTime.UtcNow },
                new() { Key = "MinOrderAmount", Value = "100", Description = "Minimum order amount", Category = "Orders", DataType = SettingDataType.Decimal, UpdatedAt = DateTime.UtcNow },
                new() { Key = "FreeShippingThreshold", Value = "1000", Description = "Free shipping above this amount", Category = "Shipping", DataType = SettingDataType.Decimal, UpdatedAt = DateTime.UtcNow },
                new() { Key = "ShippingFlatRate", Value = "50", Description = "Flat shipping charge below the free-shipping threshold", Category = "Shipping", DataType = SettingDataType.Decimal, UpdatedAt = DateTime.UtcNow }
            };

            await _context.PlatformSettings.AddRangeAsync(defaultSettings);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Default platform settings initialized");

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Default settings initialized successfully",
                Data = defaultSettings
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing platform settings");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}

// DTOs
public class CreatePlatformSettingDto
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public SettingDataType DataType { get; set; } = SettingDataType.String;
}

public class UpdatePlatformSettingDto
{
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}
