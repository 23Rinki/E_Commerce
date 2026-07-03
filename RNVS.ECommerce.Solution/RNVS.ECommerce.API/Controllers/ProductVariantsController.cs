using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/products/{productId}/[controller]")]
public class ProductVariantsController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<ProductVariantsController> _logger;

    public ProductVariantsController(VendorDbContext context, ILogger<ProductVariantsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetVariants(int productId)
    {
        try
        {
            var variants = await _context.ProductVariants
                .Where(v => v.ProductId == productId && v.IsActive)
                .ToListAsync();

            return Ok(new ApiResponseDto<List<ProductVariant>>
            {
                Success = true,
                Data = variants
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting variants");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetVariant(int productId, int id)
    {
        try
        {
            var variant = await _context.ProductVariants
                .FirstOrDefaultAsync(v => v.Id == id && v.ProductId == productId);

            if (variant == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Variant not found" });

            return Ok(new ApiResponseDto<ProductVariant> { Success = true, Data = variant });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting variant");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin,Vendor")]
    public async Task<IActionResult> CreateVariant(int productId, [FromBody] ProductVariant variant)
    {
        try
        {
            variant.ProductId = productId;
            variant.CreatedAt = DateTime.UtcNow;
            await _context.ProductVariants.AddAsync(variant);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Variant created successfully",
                Data = new { VariantId = variant.Id }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating variant");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin,Vendor")]
    public async Task<IActionResult> UpdateVariant(int productId, int id, [FromBody] ProductVariant updated)
    {
        try
        {
            var variant = await _context.ProductVariants
                .FirstOrDefaultAsync(v => v.Id == id && v.ProductId == productId);

            if (variant == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Variant not found" });

            variant.SKU = updated.SKU;
            variant.Name = updated.Name;
            variant.Price = updated.Price;
            variant.CompareAtPrice = updated.CompareAtPrice;
            variant.StockQuantity = updated.StockQuantity;
            variant.Attributes = updated.Attributes;
            variant.IsActive = updated.IsActive;

            await _context.SaveChangesAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Variant updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating variant");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin,Vendor")]
    public async Task<IActionResult> DeleteVariant(int productId, int id)
    {
        try
        {
            var variant = await _context.ProductVariants
                .FirstOrDefaultAsync(v => v.Id == id && v.ProductId == productId);

            if (variant == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Variant not found" });

            _context.ProductVariants.Remove(variant);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Variant deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting variant");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}
