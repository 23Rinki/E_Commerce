using Microsoft.AspNetCore.Authorization;
using RNVS.ECommerce.API.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.Receipt;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequireAccess("settings")]
public class BrandingSettingsController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<BrandingSettingsController> _logger;

    public BrandingSettingsController(VendorDbContext context, ILogger<BrandingSettingsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var settings = await _context.BrandingSettings.FirstOrDefaultAsync(s => s.VendorId == vendorId);
            return Ok(new ApiResponseDto<object> { Success = true, Data = settings });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting branding settings");
            var message = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Could not load receipt settings. " + message });
        }
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateBrandingDto dto)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var existing = await _context.BrandingSettings.FirstOrDefaultAsync();

            if (existing == null)
            {
                existing = new BrandingSettings
                {
                    VendorId = vendorId,
                    PrimaryColor = dto.PrimaryColor ?? "#000000",
                    SecondaryColor = dto.SecondaryColor ?? "#FFFFFF",
                    FontFamily = dto.FontFamily ?? "Arial",
                    LogoUrl = dto.LogoUrl,
                    LogoSize = dto.LogoSize ?? 100,
                    StoreName = dto.StoreName,
                    StoreAddress = dto.StoreAddress,
                    StorePhone = dto.StorePhone,
                    StoreEmail = dto.StoreEmail,
                    Website = dto.Website,
                    GstNumber = dto.GstNumber,
                    BillFieldsJson = dto.BillFieldsJson,
                    CustomerFieldsJson = dto.CustomerFieldsJson,
                    CreatedAt = DateTime.UtcNow
                };
                _context.BrandingSettings.Add(existing);
            }
            else
            {
                existing.PrimaryColor = dto.PrimaryColor ?? existing.PrimaryColor;
                existing.SecondaryColor = dto.SecondaryColor ?? existing.SecondaryColor;
                existing.FontFamily = dto.FontFamily ?? existing.FontFamily;
                existing.LogoUrl = dto.LogoUrl ?? existing.LogoUrl;
                existing.LogoSize = dto.LogoSize ?? existing.LogoSize;
                existing.StoreName = dto.StoreName ?? existing.StoreName;
                existing.StoreAddress = dto.StoreAddress ?? existing.StoreAddress;
                existing.StorePhone = dto.StorePhone ?? existing.StorePhone;
                existing.StoreEmail = dto.StoreEmail ?? existing.StoreEmail;
                existing.Website = dto.Website ?? existing.Website;
                existing.GstNumber = dto.GstNumber ?? existing.GstNumber;
                existing.BillFieldsJson = dto.BillFieldsJson ?? existing.BillFieldsJson;
                existing.CustomerFieldsJson = dto.CustomerFieldsJson ?? existing.CustomerFieldsJson;
                if (dto.CustomReceiptImageUrl != null)
                    existing.CustomReceiptImageUrl = dto.CustomReceiptImageUrl == "" ? null : dto.CustomReceiptImageUrl;
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponseDto<object> { Success = true, Data = existing, Message = "Branding updated" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating branding settings");
            var message = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Could not save receipt settings. " + message
            });
        }
    }

    // POST api/brandingsettings/receipt-template — upload vendor's custom receipt image
    [HttpPost("receipt-template")]
    public async Task<IActionResult> UploadReceiptTemplate(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "No file provided" });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Only JPG, PNG, WEBP, PDF allowed" });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "File must be under 5 MB" });

            // Magic byte validation — verify actual file content matches the claimed type
            using (var headerStream = file.OpenReadStream())
            {
                var header = new byte[12];
                await headerStream.ReadAsync(header, 0, header.Length);

                var isJpeg  = header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
                var isPng   = header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47;
                var isPdf   = header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46;
                var isWebP  = header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                           && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50;

                var validContent = (ext is ".jpg" or ".jpeg" && isJpeg)
                                || (ext == ".png"  && isPng)
                                || (ext == ".pdf"  && isPdf)
                                || (ext == ".webp" && isWebP);

                if (!validContent)
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "Invalid file. The uploaded file does not match the allowed types (JPG, PNG, PDF). Please upload a valid image or PDF."
                    });
            }

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "receipts");
            Directory.CreateDirectory(uploadsDir);

            string fileName;
            string filePath;
            string url;

            if (ext == ".pdf")
            {
                // PDFs are stored as-is
                fileName = $"{Guid.NewGuid()}.pdf";
                filePath = Path.Combine(uploadsDir, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);
            }
            else
            {
                // Images: resize to max 1240px wide and save as JPEG at 85% quality
                fileName = $"{Guid.NewGuid()}.jpg";
                filePath = Path.Combine(uploadsDir, fileName);
                using var inputStream = file.OpenReadStream();
                using var image = await SixLabors.ImageSharp.Image.LoadAsync(inputStream);
                if (image.Width > 1240)
                    image.Mutate(x => x.Resize(1240, 0)); // keep aspect ratio
                await image.SaveAsJpegAsync(filePath, new JpegEncoder { Quality = 85 });
            }

            url = $"/uploads/receipts/{fileName}";

            // Save URL directly into branding settings
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var settings = await _context.BrandingSettings.FirstOrDefaultAsync(s => s.VendorId == vendorId);
            if (settings == null)
            {
                settings = new BrandingSettings { VendorId = vendorId, CustomReceiptImageUrl = url, CreatedAt = DateTime.UtcNow };
                _context.BrandingSettings.Add(settings);
            }
            else
            {
                settings.CustomReceiptImageUrl = url;
            }
            await _context.SaveChangesAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = new { customReceiptImageUrl = url }, Message = "Receipt template uploaded" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading receipt template");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Upload failed. " + ex.Message });
        }
    }

    // DELETE api/brandingsettings/receipt-template — remove custom receipt template
    [HttpDelete("receipt-template")]
    public async Task<IActionResult> RemoveReceiptTemplate()
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var settings = await _context.BrandingSettings.FirstOrDefaultAsync(s => s.VendorId == vendorId);
            if (settings != null)
            {
                // Delete the file if it exists
                if (!string.IsNullOrWhiteSpace(settings.CustomReceiptImageUrl))
                {
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot",
                        settings.CustomReceiptImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                    if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
                }
                settings.CustomReceiptImageUrl = null;
                await _context.SaveChangesAsync();
            }
            return Ok(new ApiResponseDto<object> { Success = true, Message = "Receipt template removed" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing receipt template");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Remove failed. " + ex.Message });
        }
    }

    // POST api/brandingsettings/logo — upload logo file
    [HttpPost("logo")]
    public async Task<IActionResult> UploadLogo(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "No file provided" });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".svg" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Only JPG, PNG, WEBP, SVG allowed" });

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "logos");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            var logoUrl = $"/uploads/logos/{fileName}";
            return Ok(new ApiResponseDto<object> { Success = true, Data = new { logoUrl }, Message = "Logo uploaded" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading logo");
            var message = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Logo upload failed. " + message });
        }
    }
}

public class UpdateBrandingDto
{
    public string? PrimaryColor { get; set; }
    public string? SecondaryColor { get; set; }
    public string? FontFamily { get; set; }
    public string? LogoUrl { get; set; }
    public int? LogoSize { get; set; }
    public string? StoreName { get; set; }
    public string? StoreAddress { get; set; }
    public string? StorePhone { get; set; }
    public string? StoreEmail { get; set; }
    public string? Website { get; set; }
    public string? GstNumber { get; set; }
    public string? BillFieldsJson { get; set; }
    public string? CustomerFieldsJson { get; set; }
    public string? CustomReceiptImageUrl { get; set; }
}
