using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.DTOs.Shopping;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Shopping;
using RNVS.ECommerce.Infrastructure.Services;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly ICartRepository _cartRepository;
    private readonly StorefrontProductsService _storefront;
    private readonly ILogger<CartController> _logger;

    public CartController(
        ICartRepository cartRepository,
        StorefrontProductsService storefront,
        ILogger<CartController> logger)
    {
        _cartRepository = cartRepository;
        _storefront = storefront;
        _logger = logger;
    }

    /// <summary>
    /// Get current user's cart
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCart()
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

            var cart = await _cartRepository.GetCartWithItemsAsync(userId);

            if (cart == null)
            {
                // Create empty cart if doesn't exist
                cart = new Cart
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _cartRepository.AddAsync(cart);
            }

            // CartItem.ProductId/VendorId may point at a different vendor's own database, so the
            // EF navigation property (ci.Product) only resolves for items that happen to share this
            // request's database — look every item up cross-database via the same path the storefront uses.
            var items = new List<CartItemDto>();
            if (cart.CartItems != null)
            {
                foreach (var ci in cart.CartItems)
                {
                    var product = await _storefront.GetProductByIdAsync(ci.ProductId, ci.VendorId);
                    items.Add(new CartItemDto
                    {
                        Id = ci.Id,
                        ProductId = ci.ProductId,
                        ProductName = product?.Name ?? ci.Product?.Name ?? "Unknown",
                        UnitPrice = ci.UnitPrice,
                        Quantity = ci.Quantity,
                        TotalPrice = ci.UnitPrice * ci.Quantity,
                        ImageUrl = product?.ImageUrls?.FirstOrDefault() ?? ci.Product?.ProductImages?.FirstOrDefault()?.ImagePath,
                        VendorId = ci.VendorId ?? product?.VendorId
                    });
                }
            }

            var cartDto = new CartDto
            {
                Id = cart.Id,
                UserId = cart.UserId,
                Items = items,
                SubTotal = cart.CartItems?.Sum(ci => ci.UnitPrice * ci.Quantity) ?? 0,
                TotalItems = cart.CartItems?.Sum(ci => ci.Quantity) ?? 0
            };

            return Ok(new ApiResponseDto<CartDto>
            {
                Success = true,
                Data = cartDto
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cart");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Add item to cart
    /// </summary>
    [HttpPost("items")]
    public async Task<IActionResult> AddToCart([FromBody] AddToCartDto dto)
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

            // Resolve the product across all vendor databases — it almost certainly does not
            // live in this customer's own resolved database.
            var product = await _storefront.GetProductByIdAsync(dto.ProductId, dto.VendorId);
            if (product == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            // Check stock availability
            if (product.StockQuantity < dto.Quantity)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = $"Insufficient stock. Only {product.StockQuantity} available"
                });
            }

            // Get or create cart
            var cart = await _cartRepository.GetCartWithItemsAsync(userId);
            if (cart == null)
            {
                cart = new Cart
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                cart = await _cartRepository.AddAsync(cart);
            }

            // Check if item already in cart — ProductId alone isn't unique across vendor
            // databases, so VendorId must match too.
            var existingItem = cart.CartItems?.FirstOrDefault(ci => ci.ProductId == dto.ProductId && ci.VendorId == product.VendorId);
            if (existingItem != null)
            {
                // Update quantity
                existingItem.Quantity += dto.Quantity;
                cart.UpdatedAt = DateTime.UtcNow;
                await _cartRepository.UpdateAsync(cart);
            }
            else
            {
                // Add new item
                var cartItem = new CartItem
                {
                    CartId = cart.Id,
                    ProductId = dto.ProductId,
                    VendorId = product.VendorId,
                    Quantity = dto.Quantity,
                    UnitPrice = product.Price,
                    AddedAt = DateTime.UtcNow
                };

                if (cart.CartItems == null)
                    cart.CartItems = new List<CartItem>();

                cart.CartItems.Add(cartItem);
                cart.UpdatedAt = DateTime.UtcNow;
                await _cartRepository.UpdateAsync(cart);
            }

            _logger.LogInformation("Product {ProductId} added to cart for user {UserId}", dto.ProductId, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Item added to cart successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding item to cart");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Update cart item quantity
    /// </summary>
    [HttpPut("items/{itemId}")]
    public async Task<IActionResult> UpdateCartItem(int itemId, [FromBody] AddToCartDto dto)
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

            var cart = await _cartRepository.GetCartWithItemsAsync(userId);
            if (cart == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Cart not found"
                });
            }

            var cartItem = cart.CartItems?.FirstOrDefault(ci => ci.Id == itemId);
            if (cartItem == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Cart item not found"
                });
            }

            // Check stock — resolve cross-database using the vendor this cart item was added from
            var product = await _storefront.GetProductByIdAsync(cartItem.ProductId, cartItem.VendorId);
            if (product != null && product.StockQuantity < dto.Quantity)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = $"Insufficient stock. Only {product.StockQuantity} available"
                });
            }

            cartItem.Quantity = dto.Quantity;
            cart.UpdatedAt = DateTime.UtcNow;
            await _cartRepository.UpdateAsync(cart);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Cart updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating cart item");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Remove item from cart
    /// </summary>
    [HttpDelete("items/{itemId}")]
    public async Task<IActionResult> RemoveFromCart(int itemId)
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

            var cart = await _cartRepository.GetCartWithItemsAsync(userId);
            if (cart == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Cart not found"
                });
            }

            var cartItem = cart.CartItems?.FirstOrDefault(ci => ci.Id == itemId);
            if (cartItem == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Cart item not found"
                });
            }

            cart.CartItems?.Remove(cartItem);
            cart.UpdatedAt = DateTime.UtcNow;
            await _cartRepository.UpdateAsync(cart);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Item removed from cart"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cart item");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Clear all items from cart
    /// </summary>
    [HttpDelete("clear")]
    public async Task<IActionResult> ClearCart()
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

            var cart = await _cartRepository.GetCartWithItemsAsync(userId);
            if (cart == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Cart not found"
                });
            }

            cart.CartItems?.Clear();
            cart.UpdatedAt = DateTime.UtcNow;
            await _cartRepository.UpdateAsync(cart);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Cart cleared successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing cart");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }
}
