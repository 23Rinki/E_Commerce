using Microsoft.AspNetCore.Authorization;
using RNVS.ECommerce.API.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.Receipt;
using RNVS.ECommerce.Infrastructure.Data;
using RNVS.ECommerce.Infrastructure.PDF;
using RNVS.ECommerce.Infrastructure.PDF.Models;
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
    private readonly ApplicationDbContext _mainDb;
    private readonly PdfReceiptGenerator _pdfReceiptGenerator;
    private readonly ILogger<BrandingSettingsController> _logger;

    public BrandingSettingsController(
        VendorDbContext context,
        ApplicationDbContext mainDb,
        PdfReceiptGenerator pdfReceiptGenerator,
        ILogger<BrandingSettingsController> logger)
    {
        _context = context;
        _mainDb = mainDb;
        _pdfReceiptGenerator = pdfReceiptGenerator;
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
                    TemplateStyle = dto.TemplateStyle ?? "classic",
                    ShowQrCode = dto.ShowQrCode ?? true,
                    QrValue = dto.QrValue,
                    UseUpiQr = dto.UseUpiQr ?? false,
                    UpiId = dto.UpiId,
                    ShowBarcode = dto.ShowBarcode ?? true,
                    FooterNote = dto.FooterNote,
                    SignatureText = dto.SignatureText,
                    SignatureImageUrl = dto.SignatureImageUrl,
                    CgstPercent = dto.CgstPercent ?? 50,
                    SgstPercent = dto.SgstPercent ?? 50,
                    IgstPercent = dto.IgstPercent ?? 0,
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
                existing.TemplateStyle = dto.TemplateStyle ?? existing.TemplateStyle;
                existing.ShowQrCode = dto.ShowQrCode ?? existing.ShowQrCode;
                if (dto.QrValue != null) existing.QrValue = dto.QrValue == "" ? null : dto.QrValue;
                existing.UseUpiQr = dto.UseUpiQr ?? existing.UseUpiQr;
                if (dto.UpiId != null) existing.UpiId = dto.UpiId == "" ? null : dto.UpiId;
                existing.ShowBarcode = dto.ShowBarcode ?? existing.ShowBarcode;
                if (dto.FooterNote != null) existing.FooterNote = dto.FooterNote == "" ? null : dto.FooterNote;
                if (dto.SignatureText != null) existing.SignatureText = dto.SignatureText == "" ? null : dto.SignatureText;
                if (dto.SignatureImageUrl != null) existing.SignatureImageUrl = dto.SignatureImageUrl == "" ? null : dto.SignatureImageUrl;
                existing.CgstPercent = dto.CgstPercent ?? existing.CgstPercent;
                existing.SgstPercent = dto.SgstPercent ?? existing.SgstPercent;
                existing.IgstPercent = dto.IgstPercent ?? existing.IgstPercent;
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

    // POST api/brandingsettings/signature — upload a scanned/drawn signature image
    [HttpPost("signature")]
    public async Task<IActionResult> UploadSignature(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "No file provided" });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".svg" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Only JPG, PNG, WEBP, SVG allowed" });

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "signatures");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            var signatureImageUrl = $"/uploads/signatures/{fileName}";
            return Ok(new ApiResponseDto<object> { Success = true, Data = new { signatureImageUrl }, Message = "Signature uploaded" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading signature");
            var message = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Signature upload failed. " + message });
        }
    }

    /// <summary>
    /// Generates a real downloadable PDF receipt for a specific real order, using this vendor's
    /// saved logo/colors/store details/bill fields — not the placeholder sample data.
    /// </summary>
    [HttpGet("receipt-pdf/{orderId:int}")]
    public async Task<IActionResult> DownloadReceiptPdf(int orderId)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Order not found" });

            var items = await _context.OrderItems
                .Where(oi => oi.OrderId == orderId && oi.VendorId == vendorId)
                .ToListAsync();
            if (items.Count == 0)
                return Forbid();

            var branding = await _context.BrandingSettings.FirstOrDefaultAsync(s => s.VendorId == vendorId);
            var customer = await _mainDb.Users.FindAsync(order.UserId);

            string? customReceiptPath = null;
            if (!string.IsNullOrWhiteSpace(branding?.CustomReceiptImageUrl) && !branding.CustomReceiptImageUrl.EndsWith(".pdf"))
            {
                var candidate = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot",
                    branding.CustomReceiptImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(candidate)) customReceiptPath = candidate;
            }

            string? logoPath = null;
            if (!string.IsNullOrWhiteSpace(branding?.LogoUrl))
            {
                var candidate = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot",
                    branding.LogoUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(candidate) && !candidate.EndsWith(".svg")) logoPath = candidate;
            }

            // Bill Fields with a fixed value the vendor typed in — shown as receipt Notes
            // (blank ones are meant to auto-fill per-order, which isn't modeled per custom field here)
            string? notes = null;
            if (!string.IsNullOrWhiteSpace(branding?.BillFieldsJson))
            {
                try
                {
                    var fields = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, string>>>(branding.BillFieldsJson);
                    var fixedFields = (fields ?? new())
                        .Where(f => f.TryGetValue("label", out var l) && f.TryGetValue("value", out var v) && !string.IsNullOrWhiteSpace(v))
                        .Select(f => $"{f["label"]}: {f["value"]}");
                    notes = string.Join("\n", fixedFields);
                }
                catch (System.Text.Json.JsonException ex)
                {
                    _logger.LogWarning(ex, "Could not parse BillFieldsJson for receipt PDF");
                }
            }

            var data = new ReceiptData
            {
                ReceiptNumber = $"REC-{order.Id:D6}",
                Date = order.CreatedAt,
                OrderId = order.OrderNumber,
                Company = new CompanyInfo
                {
                    Name = branding?.StoreName ?? "Store",
                    LogoUrl = logoPath,
                    CustomReceiptImagePath = customReceiptPath,
                    Address = branding?.StoreAddress ?? "",
                    Phone = branding?.StorePhone ?? "",
                    Email = branding?.StoreEmail ?? "",
                    Website = branding?.Website ?? "",
                    TaxId = string.IsNullOrWhiteSpace(branding?.GstNumber) ? "" : branding.GstNumber,
                    PrimaryColor = string.IsNullOrWhiteSpace(branding?.PrimaryColor) ? "#1e40af" : branding.PrimaryColor,
                },
                Customer = new CustomerInfo
                {
                    Name = string.IsNullOrWhiteSpace(order.ShippingName) ? $"{customer?.FirstName} {customer?.LastName}".Trim() : order.ShippingName,
                    Email = customer?.Email ?? "",
                    Phone = string.IsNullOrWhiteSpace(order.ShippingPhone) ? (customer?.PhoneNumber ?? "") : order.ShippingPhone,
                    Address = order.ShippingStreet ?? "",
                    City = order.ShippingCity ?? "",
                    State = order.ShippingState ?? "",
                    ZipCode = order.ShippingPostalCode ?? "",
                    Country = order.ShippingCountry ?? "",
                },
                Items = items.Select(i => new ReceiptItem
                {
                    Name = i.ProductName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    Total = i.TotalPrice,
                }).ToList(),
                Subtotal = order.SubTotal,
                Tax = order.TaxAmount,
                Shipping = order.ShippingCost,
                Total = order.TotalAmount,
                PaymentMethod = "—",
                PaymentStatus = "Paid",
                Notes = notes ?? "",
            };

            var pdfBytes = await _pdfReceiptGenerator.GenerateReceiptAsync(data);

            _logger.LogInformation("Receipt PDF downloaded for order {OrderId}", orderId);
            return File(pdfBytes, "application/pdf", $"Receipt-{order.OrderNumber}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating receipt PDF for order {OrderId}", orderId);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Failed to generate receipt PDF" });
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
    public string? TemplateStyle { get; set; }
    public bool? ShowQrCode { get; set; }
    public string? QrValue { get; set; }
    public bool? UseUpiQr { get; set; }
    public string? UpiId { get; set; }
    public bool? ShowBarcode { get; set; }
    public string? FooterNote { get; set; }
    public string? SignatureText { get; set; }
    public string? SignatureImageUrl { get; set; }
    public decimal? CgstPercent { get; set; }
    public decimal? SgstPercent { get; set; }
    public decimal? IgstPercent { get; set; }
}
