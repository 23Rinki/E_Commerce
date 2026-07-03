using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.DTOs.Wishlist;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Shopping;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WishlistController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly IProductRepository _productRepository;
    private readonly ILogger<WishlistController> _logger;

    public WishlistController(
        VendorDbContext context,
        IProductRepository productRepository,
        ILogger<WishlistController> logger)
    {
        _context = context;
        _productRepository = productRepository;
        _logger = logger;
    }

    /// <summary>
    /// Get user's wishlist
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetWishlist()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var wishlistItems = await _context.Wishlists
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

            var wishlistDtos = new List<WishlistDto>();
            foreach (var item in wishlistItems)
            {
                var product = await _productRepository.GetByIdAsync(item.ProductId);
                wishlistDtos.Add(new WishlistDto
                {
                    Id = item.Id,
                    UserId = item.UserId,
                    ProductId = item.ProductId,
                    ProductName = product?.Name,
                    ProductPrice = product?.Price,
                    ProductImageUrl = product?.ProductImages?.FirstOrDefault()?.ImagePath,
                    VendorId = product?.VendorId,
                    CreatedAt = item.CreatedAt
                });
            }

            return Ok(new ApiResponseDto<List<WishlistDto>>
            {
                Success = true,
                Data = wishlistDtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting wishlist");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Add product to wishlist
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> AddToWishlist([FromBody] AddToWishlistDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid input",
                    Errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            // Check if product exists
            var product = await _productRepository.GetByIdAsync(dto.ProductId);
            if (product == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            // Check if already in wishlist
            var existingItem = await _context.Wishlists
                .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == dto.ProductId);

            if (existingItem != null)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product already in wishlist"
                });
            }

            var wishlistItem = new Wishlist
            {
                UserId = userId,
                ProductId = dto.ProductId,
                VendorId = product.VendorId,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Wishlists.AddAsync(wishlistItem);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Product {ProductId} added to wishlist for user {UserId}", dto.ProductId, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Product added to wishlist successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding to wishlist");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Remove product from wishlist
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> RemoveFromWishlist(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var wishlistItem = await _context.Wishlists
                .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

            if (wishlistItem == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Wishlist item not found"
                });
            }

            _context.Wishlists.Remove(wishlistItem);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Wishlist item {Id} removed for user {UserId}", id, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Product removed from wishlist"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing from wishlist");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Clear wishlist
    /// </summary>
    [HttpDelete("clear")]
    public async Task<IActionResult> ClearWishlist()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var wishlistItems = await _context.Wishlists
                .Where(w => w.UserId == userId)
                .ToListAsync();

            _context.Wishlists.RemoveRange(wishlistItems);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Wishlist cleared for user {UserId}", userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Wishlist cleared successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing wishlist");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }
}
