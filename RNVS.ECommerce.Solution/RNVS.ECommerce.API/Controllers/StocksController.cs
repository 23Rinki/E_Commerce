using Microsoft.AspNetCore.Authorization;
using RNVS.ECommerce.API.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Inventory;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequireAccess("inventory")]
public class StocksController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly VendorDbContext _vendorContext;
    private readonly IProductRepository _productRepository;
    private readonly ILogger<StocksController> _logger;

    public StocksController(ApplicationDbContext context, VendorDbContext vendorContext, IProductRepository productRepository, ILogger<StocksController> logger)
    {
        _context = context;
        _vendorContext = vendorContext;
        _productRepository = productRepository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllStocks()
    {
        try
        {
            var stocks = await _vendorContext.Stocks.ToListAsync();
            return Ok(new ApiResponseDto<List<Stock>> { Success = true, Data = stocks });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stocks");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetStockByProduct(int productId)
    {
        try
        {
            var stock = await _vendorContext.Stocks.FirstOrDefaultAsync(s => s.ProductId == productId);
            if (stock == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Stock not found" });

            return Ok(new ApiResponseDto<Stock> { Success = true, Data = stock });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stock");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStockProducts()
    {
        try
        {
            var lowStocks = await _vendorContext.Stocks
                .Where(s => s.CurrentQuantity <= s.MinimumThreshold)
                .ToListAsync();

            return Ok(new ApiResponseDto<List<Stock>> { Success = true, Data = lowStocks });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting low stock");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateStock([FromBody] Stock stock)
    {
        try
        {
            var product = await _productRepository.GetByIdAsync(stock.ProductId);
            stock.VendorId = product?.VendorId;
            stock.LastUpdated = DateTime.UtcNow;
            await _vendorContext.Stocks.AddAsync(stock);
            await _vendorContext.SaveChangesAsync();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Stock created successfully",
                Data = new { StockId = stock.Id }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating stock");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateStock(int id, [FromBody] Stock updated)
    {
        try
        {
            var stock = await _vendorContext.Stocks.FindAsync(id);
            if (stock == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Stock not found" });

            stock.CurrentQuantity = updated.CurrentQuantity;
            stock.ReservedQuantity = updated.ReservedQuantity;
            stock.MinimumThreshold = updated.MinimumThreshold;
            stock.LastUpdated = DateTime.UtcNow;

            await _vendorContext.SaveChangesAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Stock updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating stock");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteStock(int id)
    {
        try
        {
            var stock = await _vendorContext.Stocks.FindAsync(id);
            if (stock == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Stock not found" });

            _vendorContext.Stocks.Remove(stock);
            await _vendorContext.SaveChangesAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Stock deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting stock");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}
