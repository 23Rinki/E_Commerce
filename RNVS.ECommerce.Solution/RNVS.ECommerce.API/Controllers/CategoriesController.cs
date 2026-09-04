using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RNVS.ECommerce.Application.DTOs.Category;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Infrastructure.Services;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IProductRepository _productRepository;
    private readonly StorefrontProductsService _storefront;
    private readonly ILogger<CategoriesController> _logger;

    public CategoriesController(
        ICategoryRepository categoryRepository,
        IProductRepository productRepository,
        StorefrontProductsService storefront,
        ILogger<CategoriesController> logger)
    {
        _categoryRepository = categoryRepository;
        _productRepository = productRepository;
        _storefront = storefront;
        _logger = logger;
    }

    // GET: api/categories/storefront — categories aggregated from ALL vendor DBs (for guest/customer view)
    [HttpGet("storefront")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStorefrontCategories()
    {
        try
        {
            var names = await _storefront.GetAllCategoryNamesAsync();
            var categoryDtos = names.Select((name, i) => new CategoryDto
            {
                Id = i + 1,
                Name = name,
                IsActive = true
            }).ToList();

            return Ok(new ApiResponseDto<List<CategoryDto>>
            {
                Success = true,
                Data = categoryDtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching storefront categories");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    // GET: api/categories
    // Vendor JWT → their own categories only (via TenantContext)
    // Guest / Customer / Admin → all categories aggregated from every vendor DB
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories()
    {
        try
        {
            var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

            if (role == "Vendor")
            {
                var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
                var vendorProducts = await _productRepository.GetByVendorAsync(vendorId);

                // Only show categories that this vendor actually has active products in
                var activeCatIds = vendorProducts
                    .Where(p => p.IsActive)
                    .Select(p => p.CategoryId)
                    .Distinct()
                    .ToHashSet();

                var allCats = await _categoryRepository.GetActiveCategoriesAsync();
                var dtos = allCats
                    .Where(c => activeCatIds.Contains(c.Id))
                    .Select(c => new CategoryDto
                    {
                        Id          = c.Id,
                        Name        = c.Name,
                        Description = c.Description,
                        IsActive    = c.IsActive
                    })
                    .ToList();

                return Ok(new ApiResponseDto<List<CategoryDto>> { Success = true, Data = dtos });
            }
            else
            {
                var names = await _storefront.GetAllCategoryNamesAsync();
                var dtos = names.Select((name, i) => new CategoryDto
                {
                    Id       = i + 1,
                    Name     = name,
                    IsActive = true
                }).ToList();

                return Ok(new ApiResponseDto<List<CategoryDto>> { Success = true, Data = dtos });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching categories");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors  = new List<string> { ex.Message }
            });
        }
    }

    // GET: api/categories/mine — ALL active categories in the vendor's own DB, unfiltered by product usage
    // (used by the Add/Edit Product form so a vendor can assign a category they haven't used yet)
    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> GetMyCategories()
    {
        try
        {
            var allCats = await _categoryRepository.GetActiveCategoriesAsync();
            var dtos = allCats
                .Select(c => new CategoryDto
                {
                    Id          = c.Id,
                    Name        = c.Name,
                    Description = c.Description,
                    IsActive    = c.IsActive
                })
                .ToList();

            return Ok(new ApiResponseDto<List<CategoryDto>> { Success = true, Data = dtos });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching vendor categories");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors  = new List<string> { ex.Message }
            });
        }
    }

    // GET: api/categories/{id}
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategory(int id)
    {
        try
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Category not found"
                });
            }

            var categoryDto = new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                IsActive = category.IsActive
            };

            return Ok(new ApiResponseDto<CategoryDto>
            {
                Success = true,
                Data = categoryDto
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching category with id {CategoryId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // POST: api/categories
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryCreateDto dto)
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

            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && userRole != "SuperAdmin" && userRole != "Vendor")
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Only vendors and administrators can create categories"
                });
            }

            // Check if category name already exists
            var existingCategory = await _categoryRepository.GetByNameAsync(dto.Name);
            if (existingCategory != null)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "A category with this name already exists"
                });
            }

            var category = new Category
            {
                Name = dto.Name,
                Description = dto.Description,
                IsActive = true
            };

            var createdCategory = await _categoryRepository.AddAsync(category);

            var categoryDto = new CategoryDto
            {
                Id = createdCategory.Id,
                Name = createdCategory.Name,
                Description = createdCategory.Description,
                IsActive = createdCategory.IsActive
            };

            _logger.LogInformation("Category created: {CategoryId} by user {UserId}", createdCategory.Id, User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            return CreatedAtAction(nameof(GetCategory), new { id = createdCategory.Id }, new ApiResponseDto<CategoryDto>
            {
                Success = true,
                Message = "Category created successfully",
                Data = categoryDto
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // PUT: api/categories/{id}
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] CategoryUpdateDto dto)
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

            // Check if user is Admin/SuperAdmin
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && userRole != "SuperAdmin")
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Only administrators can update categories"
                });
            }

            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Category not found"
                });
            }

            // Check if new name conflicts with existing category
            if (category.Name != dto.Name)
            {
                var existingCategory = await _categoryRepository.GetByNameAsync(dto.Name);
                if (existingCategory != null && existingCategory.Id != id)
                {
                    return BadRequest(new ApiResponseDto<object>
                    {
                        Success = false,
                        Message = "A category with this name already exists"
                    });
                }
            }

            category.Name = dto.Name;
            category.Description = dto.Description;
            category.IsActive = dto.IsActive;

            await _categoryRepository.UpdateAsync(category);

            _logger.LogInformation("Category updated: {CategoryId} by user {UserId}", id, User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Category updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category with id {CategoryId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // DELETE: api/categories/{id}
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        try
        {
            // Check if user is Admin/SuperAdmin
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && userRole != "SuperAdmin")
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Only administrators can delete categories"
                });
            }

            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Category not found"
                });
            }

            // Check if there are active products in this category
            var productsInCategory = await _productRepository.GetByCategoryAsync(id);
            if (productsInCategory.Any(p => p.IsActive))
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Cannot delete category with active products. Please deactivate or reassign products first."
                });
            }

            // Soft delete - mark as inactive
            category.IsActive = false;
            await _categoryRepository.UpdateAsync(category);

            _logger.LogInformation("Category deleted (soft): {CategoryId} by user {UserId}", id, User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Category deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category with id {CategoryId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }
}
