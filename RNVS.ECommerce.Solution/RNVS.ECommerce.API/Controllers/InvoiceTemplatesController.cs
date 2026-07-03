using Microsoft.AspNetCore.Authorization;
using RNVS.ECommerce.API.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.Receipt;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequireAccess("invoices")]
public class InvoiceTemplatesController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<InvoiceTemplatesController> _logger;

    public InvoiceTemplatesController(VendorDbContext context, ILogger<InvoiceTemplatesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetTemplates()
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var templates = await _context.InvoiceTemplates
                .Where(t => t.VendorId == vendorId)
                .OrderByDescending(t => t.IsDefault)
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();
            return Ok(new ApiResponseDto<object> { Success = true, Data = templates });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice templates");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTemplate(int id)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var template = await _context.InvoiceTemplates.FindAsync(id);
            if (template == null || template.VendorId != vendorId)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Template not found" });

            return Ok(new ApiResponseDto<object> { Success = true, Data = template });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice template");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateInvoiceTemplateDto request)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

            // If this is set as default, unset other defaults for this vendor
            if (request.IsDefault)
            {
                var existingDefaults = await _context.InvoiceTemplates
                    .Where(t => t.VendorId == vendorId && t.IsDefault)
                    .ToListAsync();
                foreach (var t in existingDefaults)
                {
                    t.IsDefault = false;
                }
            }

            var template = new InvoiceTemplate
            {
                VendorId = vendorId,
                Name = request.Name,
                Description = request.Description,
                HtmlTemplate = request.HtmlTemplate,
                IsDefault = request.IsDefault,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.InvoiceTemplates.Add(template);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Invoice template created: {TemplateId}", template.Id);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Invoice template created successfully",
                Data = template
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice template");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTemplate(int id, [FromBody] UpdateInvoiceTemplateDto request)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var template = await _context.InvoiceTemplates.FindAsync(id);
            if (template == null || template.VendorId != vendorId)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Template not found" });

            // If this is set as default, unset other defaults for this vendor
            if (request.IsDefault && !template.IsDefault)
            {
                var existingDefaults = await _context.InvoiceTemplates
                    .Where(t => t.VendorId == vendorId && t.IsDefault && t.Id != id)
                    .ToListAsync();
                foreach (var t in existingDefaults)
                {
                    t.IsDefault = false;
                }
            }

            template.Name = request.Name ?? template.Name;
            template.Description = request.Description ?? template.Description;
            template.HtmlTemplate = request.HtmlTemplate ?? template.HtmlTemplate;
            template.IsDefault = request.IsDefault;
            template.IsActive = request.IsActive;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Invoice template updated: {TemplateId}", template.Id);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Invoice template updated successfully",
                Data = template
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating invoice template");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTemplate(int id)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var template = await _context.InvoiceTemplates.FindAsync(id);
            if (template == null || template.VendorId != vendorId)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Template not found" });

            if (template.IsDefault)
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Cannot delete default template. Set another template as default first." });

            _context.InvoiceTemplates.Remove(template);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Invoice template deleted: {TemplateId}", id);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Invoice template deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting invoice template");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPost("{id}/set-default")]
    public async Task<IActionResult> SetDefaultTemplate(int id)
    {
        try
        {
            var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var template = await _context.InvoiceTemplates.FindAsync(id);
            if (template == null || template.VendorId != vendorId)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Template not found" });

            // Unset all other defaults for this vendor
            var existingDefaults = await _context.InvoiceTemplates
                .Where(t => t.VendorId == vendorId && t.IsDefault)
                .ToListAsync();
            foreach (var t in existingDefaults)
            {
                t.IsDefault = false;
            }

            template.IsDefault = true;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Invoice template set as default: {TemplateId}", id);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Template set as default successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting default template");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}

// DTOs
public class CreateInvoiceTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string HtmlTemplate { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;
}

public class UpdateInvoiceTemplateDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? HtmlTemplate { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
}
