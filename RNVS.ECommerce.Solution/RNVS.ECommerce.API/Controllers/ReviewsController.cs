using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.DTOs.Review;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Product;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewRepository _reviewRepository;
    private readonly IProductRepository _productRepository;
    private readonly ILogger<ReviewsController> _logger;

    public ReviewsController(
        IReviewRepository reviewRepository,
        IProductRepository productRepository,
        ILogger<ReviewsController> logger)
    {
        _reviewRepository = reviewRepository;
        _productRepository = productRepository;
        _logger = logger;
    }

    /// <summary>
    /// Get all reviews for a product
    /// </summary>
    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetProductReviews(int productId)
    {
        try
        {
            var reviews = await _reviewRepository.GetByProductIdAsync(productId);
            var reviewDtos = reviews
                .Where(r => r.IsApproved) // Only show approved reviews to public
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    ProductId = r.ProductId,
                    UserId = r.UserId,
                    CreatedAt = r.CreatedAt,
                    IsApproved = r.IsApproved
                })
                .OrderByDescending(r => r.CreatedAt)
                .ToList();

            return Ok(new ApiResponseDto<List<ReviewDto>>
            {
                Success = true,
                Data = reviewDtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting reviews for product {ProductId}", productId);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get user's reviews
    /// </summary>
    [HttpGet("my-reviews")]
    [Authorize]
    public async Task<IActionResult> GetMyReviews()
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

            var reviews = await _reviewRepository.GetByUserIdAsync(userId);
            var reviewDtos = reviews
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    ProductId = r.ProductId,
                    UserId = r.UserId,
                    CreatedAt = r.CreatedAt,
                    IsApproved = r.IsApproved
                })
                .OrderByDescending(r => r.CreatedAt)
                .ToList();

            return Ok(new ApiResponseDto<List<ReviewDto>>
            {
                Success = true,
                Data = reviewDtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user reviews");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Create a review for a product
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewDto dto)
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

            // Check if user already reviewed this product
            var existingReviews = await _reviewRepository.GetByProductIdAsync(dto.ProductId);
            if (existingReviews.Any(r => r.UserId == userId))
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "You have already reviewed this product"
                });
            }

            var review = new Review
            {
                Rating = dto.Rating,
                Comment = dto.Comment,
                ProductId = dto.ProductId,
                VendorId = product.VendorId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                IsApproved = false // Requires admin approval
            };

            await _reviewRepository.AddAsync(review);
            _logger.LogInformation("Review created for product {ProductId} by user {UserId}", dto.ProductId, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Review submitted successfully. It will be visible after admin approval."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating review");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Update review
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateReview(int id, [FromBody] CreateReviewDto dto)
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
            var review = await _reviewRepository.GetByIdAsync(id);

            if (review == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Review not found"
                });
            }

            // Check if user owns this review
            if (review.UserId != userId)
            {
                return Forbid();
            }

            review.Rating = dto.Rating;
            review.Comment = dto.Comment;
            review.IsApproved = false; // Reset approval status after edit
            await _reviewRepository.UpdateAsync(review);

            _logger.LogInformation("Review {ReviewId} updated by user {UserId}", id, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Review updated successfully. It will be reviewed by admin."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating review {ReviewId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Delete review
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var review = await _reviewRepository.GetByIdAsync(id);

            if (review == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Review not found"
                });
            }

            // User can delete their own review, or admin can delete any review
            if (review.UserId != userId && userRole != "Admin" && userRole != "SuperAdmin")
            {
                return Forbid();
            }

            await _reviewRepository.DeleteAsync(review);
            _logger.LogInformation("Review {ReviewId} deleted", id);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Review deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting review {ReviewId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Approve review (Admin only)
    /// </summary>
    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ApproveReview(int id)
    {
        try
        {
            var review = await _reviewRepository.GetByIdAsync(id);
            if (review == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Review not found"
                });
            }

            review.IsApproved = true;
            await _reviewRepository.UpdateAsync(review);

            _logger.LogInformation("Review {ReviewId} approved", id);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Review approved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving review {ReviewId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get pending reviews (Admin only)
    /// </summary>
    [HttpGet("pending")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetPendingReviews()
    {
        try
        {
            var reviews = await _reviewRepository.GetPendingReviewsAsync();
            var reviewDtos = reviews
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    ProductId = r.ProductId,
                    UserId = r.UserId,
                    CreatedAt = r.CreatedAt,
                    IsApproved = r.IsApproved
                })
                .OrderBy(r => r.CreatedAt)
                .ToList();

            return Ok(new ApiResponseDto<List<ReviewDto>>
            {
                Success = true,
                Data = reviewDtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending reviews");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }
}
