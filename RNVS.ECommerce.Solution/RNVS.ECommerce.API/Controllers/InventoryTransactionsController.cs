using Microsoft.AspNetCore.Authorization;
using RNVS.ECommerce.API.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Inventory;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequireAccess("inventory")]
public class InventoryTransactionsController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly IProductRepository _productRepository;
    private readonly ILogger<InventoryTransactionsController> _logger;

    public InventoryTransactionsController(VendorDbContext context, IProductRepository productRepository, ILogger<InventoryTransactionsController> logger)
    {
        _context = context;
        _productRepository = productRepository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTransactions()
    {
        try
        {
            var transactions = await _context.InventoryTransactions
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponseDto<List<InventoryTransaction>> { Success = true, Data = transactions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transactions");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetTransactionsByProduct(int productId)
    {
        try
        {
            var transactions = await _context.InventoryTransactions
                .Where(t => t.ProductId == productId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponseDto<List<InventoryTransaction>> { Success = true, Data = transactions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transactions");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] InventoryTransaction transaction)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            transaction.CreatedBy = userId ?? "system";
            transaction.CreatedAt = DateTime.UtcNow;

            var product = await _productRepository.GetByIdAsync(transaction.ProductId);
            transaction.VendorId = product?.VendorId;

            await _context.InventoryTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Transaction created successfully",
                Data = new { TransactionId = transaction.Id }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTransaction(int id)
    {
        try
        {
            var transaction = await _context.InventoryTransactions.FindAsync(id);
            if (transaction == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Transaction not found" });

            return Ok(new ApiResponseDto<InventoryTransaction> { Success = true, Data = transaction });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}
