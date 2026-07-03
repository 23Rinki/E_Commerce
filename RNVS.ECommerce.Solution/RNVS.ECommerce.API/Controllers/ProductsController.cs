using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Analytics;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.DTOs.Product;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Analytics;
using RNVS.ECommerce.Domain.Entities.Platform;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data;
using RNVS.ECommerce.Infrastructure.Email;
using RNVS.ECommerce.Infrastructure.Search;
using RNVS.ECommerce.Infrastructure.Search.Models;
using RNVS.ECommerce.Infrastructure.Services;
using RNVS.ECommerce.Infrastructure.Storage;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductRepository _productRepository;
    private readonly IProductImageRepository _productImageRepository;
    private readonly IFileStorageService _fileStorageService;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUserRepository _userRepository;
    private readonly ISearchService _searchService;
    private readonly IUserBehaviorRepository _userBehaviorRepository;
    private readonly ApplicationDbContext _mainDb;
    private readonly StorefrontProductsService _storefront;
    private readonly IEmailService _emailService;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(
        IProductRepository productRepository,
        IProductImageRepository productImageRepository,
        IFileStorageService fileStorageService,
        ICategoryRepository categoryRepository,
        IUserRepository userRepository,
        ISearchService searchService,
        IUserBehaviorRepository userBehaviorRepository,
        ApplicationDbContext mainDb,
        StorefrontProductsService storefront,
        IEmailService emailService,
        ILogger<ProductsController> logger)
    {
        _productRepository = productRepository;
        _productImageRepository = productImageRepository;
        _fileStorageService = fileStorageService;
        _categoryRepository = categoryRepository;
        _userRepository = userRepository;
        _searchService = searchService;
        _userBehaviorRepository = userBehaviorRepository;
        _mainDb = mainDb;
        _storefront = storefront;
        _emailService = emailService;
        _logger = logger;
    }

    // ========== EXISTING ANALYTICS ENDPOINTS (kept as-is) ==========

    /// <summary>
    /// Track product view - Called by frontend when user views a product
    /// </summary>
    [HttpPost("{productId}/track-view")]
    [AllowAnonymous]
    public async Task<IActionResult> TrackProductView(int productId, [FromBody] TrackProductViewDto trackDto)
    {
        try
        {
            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null)
            {
                return NotFound(new { message = "Product not found" });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

            var behavior = new UserBehavior
            {
                UserId = userId,
                SessionId = trackDto.SessionId ?? Guid.NewGuid().ToString(),
                EventType = UserEventType.ProductView,
                ProductId = productId,
                IPAddress = ipAddress,
                Metadata = System.Text.Json.JsonSerializer.Serialize(new
                {
                    referrer = trackDto.Referrer,
                    userAgent = userAgent,
                    productName = product.Name
                }),
                CreatedAt = DateTime.UtcNow
            };

            // Write to vendor DB (vendor analytics dashboard)
            await _userBehaviorRepository.AddAsync(behavior);

            // Also write to main DB (platform-wide analytics — guests + all vendors)
            var platformBehavior = new UserBehavior
            {
                UserId    = behavior.UserId,
                VendorId  = product.VendorId,
                SessionId = behavior.SessionId,
                EventType = behavior.EventType,
                ProductId = behavior.ProductId,
                IPAddress = behavior.IPAddress,
                Metadata  = behavior.Metadata,
                CreatedAt = behavior.CreatedAt,
            };
            _mainDb.UserBehaviors.Add(platformBehavior);
            await _mainDb.SaveChangesAsync();

            _logger.LogInformation(
                "PRODUCT_VIEW | User: {UserId} | Product: {ProductId} ({ProductName}) | Session: {SessionId} | IP: {IpAddress} | Referrer: {Referrer} | DateTime: {DateTime}",
                userId ?? "Guest",
                productId,
                product.Name,
                behavior.SessionId,
                ipAddress ?? "Unknown",
                trackDto.Referrer ?? "Direct",
                DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
            );

            return Ok(new { success = true, message = "View tracked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking product view for ProductId={ProductId}", productId);
            return StatusCode(500, new { message = "Error tracking product view" });
        }
    }

    /// <summary>
    /// Get user's browsing history - For authenticated users
    /// </summary>
    [HttpGet("browsing-history")]
    [Authorize]
    public async Task<IActionResult> GetBrowsingHistory([FromQuery] int limit = 20)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var views = await _userBehaviorRepository.GetProductViewsByUserIdAsync(userId, limit);

            _logger.LogInformation(
                "BROWSING_HISTORY_REQUESTED | User: {UserId} | Limit: {Limit} | TotalViews: {TotalViews} | DateTime: {DateTime}",
                userId,
                limit,
                views.Count(),
                DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
            );

            var historyDto = new UserBrowsingHistoryDto
            {
                TotalViews = views.Count(),
                ViewedProductIds = views.Where(v => v.ProductId.HasValue)
                                        .Select(v => v.ProductId!.Value)
                                        .Distinct()
                                        .ToList(),
                RecentViews = views.Where(v => v.ProductId.HasValue)
                                  .Select(v => new ProductViewHistoryDto
                                  {
                                      Id = v.Id,
                                      ProductId = v.ProductId!.Value,
                                      UserId = v.UserId,
                                      SessionId = v.SessionId,
                                      ViewedAt = v.CreatedAt
                                  }).ToList()
            };

            return Ok(historyDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting browsing history");
            return StatusCode(500, new { message = "Error retrieving browsing history" });
        }
    }

    /// <summary>
    /// Get recently viewed products by session - For guest users
    /// </summary>
    [HttpGet("recently-viewed")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRecentlyViewed([FromQuery] string sessionId, [FromQuery] int limit = 10)
    {
        try
        {
            if (string.IsNullOrEmpty(sessionId))
            {
                return BadRequest(new { message = "SessionId is required" });
            }

            var views = await _userBehaviorRepository.GetBySessionIdAsync(sessionId);

            _logger.LogInformation(
                "RECENT_VIEWS_REQUESTED | Session: {SessionId} | Limit: {Limit} | TotalFound: {TotalFound} | DateTime: {DateTime}",
                sessionId,
                limit,
                views.Count(),
                DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
            );

            var recentViews = views
                .Where(v => v.EventType == UserEventType.ProductView && v.ProductId.HasValue)
                .OrderByDescending(v => v.CreatedAt)
                .Take(limit)
                .Select(v => new ProductViewHistoryDto
                {
                    Id = v.Id,
                    ProductId = v.ProductId!.Value,
                    SessionId = v.SessionId,
                    ViewedAt = v.CreatedAt
                })
                .ToList();

            return Ok(recentViews);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recently viewed products");
            return StatusCode(500, new { message = "Error retrieving recently viewed products" });
        }
    }

    /// <summary>
    /// Get product view count - For analytics
    /// </summary>
    [HttpGet("{productId}/view-count")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProductViewCount(int productId, [FromQuery] int? days = null)
    {
        try
        {
            DateTime? since = days.HasValue ? DateTime.UtcNow.AddDays(-days.Value) : null;
            var count = await _userBehaviorRepository.GetProductViewCountAsync(productId, since);

            return Ok(new { productId, viewCount = count, period = days.HasValue ? $"Last {days} days" : "All time" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting product view count");
            return StatusCode(500, new { message = "Error retrieving view count" });
        }
    }

    // ========== NEW CRUD ENDPOINTS ==========

    // GET: api/products/vendor/mine — vendor's own products only
    [HttpGet("vendor/mine")]
    [Authorize]
    public async Task<IActionResult> GetMyProducts([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var vendorProducts = await _productRepository.FindAsync(p => p.VendorId == userId);
            var list = vendorProducts.OrderByDescending(p => p.CreatedAt).ToList();

            var totalCount = list.Count;
            var paged = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            var productIds = paged.Select(p => p.Id).ToList();
            var primaryImages = await _productImageRepository.GetPrimaryImageUrlsAsync(productIds);

            var categoryIds = paged.Select(p => p.CategoryId).Distinct().ToList();
            var categories = new Dictionary<int, string>();
            foreach (var cid in categoryIds)
            {
                var cat = await _categoryRepository.GetByIdAsync(cid);
                if (cat != null) categories[cid] = cat.Name;
            }

            var products = paged.Select(p => new ProductListDto
            {
                Id = p.Id,
                Name = p.Name,
                Price = p.Price,
                DiscountPrice = p.DiscountPrice,
                CategoryName = categories.TryGetValue(p.CategoryId, out var cn) ? cn : "",
                IsActive = p.IsActive,
                PrimaryImageUrl = primaryImages.TryGetValue(p.Id, out var img) ? img : null,
                StockQuantity = p.StockQuantity,
            }).ToList();

            return Ok(new ApiResponseDto<PaginatedResultDto<ProductListDto>>
            {
                Success = true,
                Data = new PaginatedResultDto<ProductListDto>
                {
                    Items = products,
                    TotalCount = totalCount,
                    PageNumber = page,
                    PageSize = pageSize
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching vendor's own products");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // GET: api/products — storefront view
    // Vendors see only their own products; customers/guests see all vendors' products
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetProducts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null,
        [FromQuery] int? pageNumber = null,
        [FromQuery] bool includeInactive = false)
    {
        var resolvedPage = pageNumber ?? page;
        try
        {
            var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            var isVendor = role == "Vendor";
            var isAdmin = role == "Admin" || role == "SuperAdmin";

            List<ProductListDto> items;
            int totalCount;

            if (isVendor)
            {
                var vendorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
                var all = await _productRepository.GetByVendorAsync(vendorId);

                // Apply category filter by name
                if (!string.IsNullOrWhiteSpace(category))
                {
                    var cat = await _categoryRepository.GetByNameAsync(category);
                    if (cat == null)
                        all = Enumerable.Empty<Product>();
                    else
                        all = all.Where(p => p.CategoryId == cat.Id);
                }

                var sorted = all.Where(p => p.IsActive).OrderByDescending(p => p.Id).ToList();
                totalCount = sorted.Count;
                var paged = sorted.Skip((resolvedPage - 1) * pageSize).Take(pageSize).ToList();

                var productIds = paged.Select(p => p.Id).ToList();
                var imageMap  = await _productImageRepository.GetPrimaryImageUrlsAsync(productIds);

                var catAll = await _categoryRepository.GetAllAsync();
                var catMap = catAll.ToDictionary(c => c.Id, c => c.Name);

                items = paged.Select(p => new ProductListDto
                {
                    Id              = p.Id,
                    Name            = p.Name,
                    Price           = p.Price,
                    DiscountPrice   = p.DiscountPrice,
                    CategoryId      = p.CategoryId,
                    CategoryName    = catMap.TryGetValue(p.CategoryId, out var cn) ? cn : "",
                    IsActive        = p.IsActive,
                    PrimaryImageUrl = imageMap.TryGetValue(p.Id, out var img) ? img : null,
                    StockQuantity   = p.StockQuantity,
                    VendorId        = p.VendorId,
                }).ToList();
            }
            else
            {
                (items, totalCount) = await _storefront.GetAllProductsAsync(resolvedPage, pageSize, category, includeInactive: isAdmin && includeInactive);
            }

            return Ok(new ApiResponseDto<PaginatedResultDto<ProductListDto>>
            {
                Success = true,
                Data = new PaginatedResultDto<ProductListDto>
                {
                    Items      = items,
                    TotalCount = totalCount,
                    PageNumber = resolvedPage,
                    PageSize   = pageSize
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching storefront products");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors  = new List<string> { ex.Message }
            });
        }
    }

    // GET: api/products/{id} — searches all vendor databases for the product
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProduct(int id, [FromQuery] string? v = null)
    {
        try
        {
            var productDetailsDto = await _storefront.GetProductByIdAsync(id, v);

            if (productDetailsDto == null)
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });

            return Ok(new ApiResponseDto<ProductDetailsDto>
            {
                Success = true,
                Data = productDetailsDto
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching product with id {ProductId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // POST: api/products
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateProduct([FromBody] ProductCreateDto dto)
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

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Only Vendors and Admins can create products
            if (userRole != "Vendor" && userRole != "Admin" && userRole != "SuperAdmin")
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Only vendors and administrators can create products"
                });
            }

            // Verify category exists
            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid category ID"
                });
            }

            // Vendors create products for themselves, Admins can specify vendorId
            var vendorId = userId;

            var (moderationReason, moderationDetail) = await CheckModerationAsync(vendorId!, dto.Name, dto.Description);

            var product = new Product
            {
                Name = dto.Name,
                ShortDescription = dto.ShortDescription,
                Description = dto.Description,
                Price = dto.Price,
                BasePrice = dto.Price,
                DiscountPrice = dto.DiscountPrice,
                StockQuantity = dto.StockQuantity,
                CategoryId = dto.CategoryId,
                VendorId = vendorId!,
                CreatedAt = DateTime.UtcNow,
                IsActive = moderationReason == null
            };

            var createdProduct = await _productRepository.AddAsync(product);

            if (moderationReason != null)
            {
                await FlagProductAsync(vendorId!, createdProduct.Id, moderationReason.Value, moderationDetail);
            }
            else
            {
                _ = _searchService.IndexDocumentAsync(new SearchIndex
                {
                    Id            = createdProduct.Id.ToString(),
                    Type          = "Product",
                    Title         = createdProduct.Name,
                    Description   = createdProduct.Description ?? "",
                    Category      = category.Name,
                    CategoryId    = createdProduct.CategoryId.ToString(),
                    Price         = createdProduct.Price,
                    DiscountPrice = createdProduct.DiscountPrice,
                    StockQuantity = createdProduct.StockQuantity,
                    IsActive      = createdProduct.IsActive,
                    VendorId      = createdProduct.VendorId,
                    CreatedAt     = createdProduct.CreatedAt,
                    UpdatedAt     = createdProduct.CreatedAt,
                    Url           = $"/products/{createdProduct.Id}",
                });
            }

            _logger.LogInformation("Product created: {ProductId} by user {UserId}{Flagged}", createdProduct.Id, userId, moderationReason != null ? " (flagged for review)" : "");

            return CreatedAtAction(nameof(GetProduct), new { id = createdProduct.Id }, new ApiResponseDto<object>
            {
                Success = true,
                Message = moderationReason != null
                    ? "Product submitted — pending review before it goes live."
                    : "Product created successfully",
                Data = new { id = createdProduct.Id, pendingReview = moderationReason != null }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating product");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // PUT: api/products/{id}
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductUpdateDto dto)
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

            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Vendors can only update their own products
            if (userRole == "Vendor" && product.VendorId != userId)
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "You can only manage your own products"
                });
            }

            // Re-check the banned-word list on every edit, in case a clean product is edited to add bad content
            var (moderationReason, moderationDetail) = await CheckModerationAsync(product.VendorId, dto.Name, dto.Description);

            // Update product fields
            product.Name = dto.Name;
            product.ShortDescription = dto.ShortDescription;
            product.Description = dto.Description;
            product.Price = dto.Price;
            product.DiscountPrice = dto.DiscountPrice;
            product.StockQuantity = dto.StockQuantity;
            product.CategoryId = dto.CategoryId;
            product.IsActive = moderationReason == null && dto.IsActive;

            await _productRepository.UpdateAsync(product);

            if (moderationReason != null)
            {
                await FlagProductAsync(product.VendorId, product.Id, moderationReason.Value, moderationDetail);
                _ = _searchService.DeleteDocumentAsync(product.Id.ToString(), product.VendorId);
            }
            else
            {
                _ = _searchService.UpdateDocumentAsync(new SearchIndex
                {
                    Id            = product.Id.ToString(),
                    Type          = "Product",
                    Title         = product.Name,
                    Description   = product.Description ?? "",
                    CategoryId    = product.CategoryId.ToString(),
                    Price         = product.Price,
                    DiscountPrice = product.DiscountPrice,
                    StockQuantity = product.StockQuantity,
                    IsActive      = product.IsActive,
                    VendorId      = product.VendorId,
                    UpdatedAt     = DateTime.UtcNow,
                    Url           = $"/products/{product.Id}",
                });
            }

            _logger.LogInformation("Product updated: {ProductId} by user {UserId}{Flagged}", id, userId, moderationReason != null ? " (flagged for review)" : "");

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = moderationReason != null
                    ? "Product updated, but flagged for review — it is hidden until approved."
                    : "Product updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating product with id {ProductId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // DELETE: api/products/{id}
    // Resolves the product's REAL owner first and connects directly to that vendor's own
    // database — same fix as DeleteProductImage, needed for Admin moderation actions.
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteProduct(int id, [FromQuery] string? v = null)
    {
        try
        {
            var productDetail = await _storefront.GetProductByIdAsync(id, v);
            var vendorId = productDetail?.VendorId;
            if (productDetail == null || string.IsNullOrEmpty(vendorId))
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Vendors can only delete their own products
            if (userRole == "Vendor" && vendorId != userId)
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "You can only manage your own products"
                });
            }

            await using var vendorDb = await _storefront.OpenVendorDbContextAsync(vendorId);
            var product = await vendorDb.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            // Soft delete
            product.IsActive = false;

            // Archive this product's images the same way single-image removal does, so they
            // show up in "Removed Images" history and land in wwwroot/uploads/removed — instead
            // of just sitting unused on disk under the old isActive=false product.
            var images = await vendorDb.ProductImages.Where(i => i.ProductId == id).ToListAsync();
            if (images.Count > 0)
            {
                var vendorUser = await _mainDb.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == vendorId);
                var vendorName = vendorUser?.UserName ?? vendorId;
                var safeFolder = string.Concat(vendorName.Where(c => !"@.".Contains(c) && !Path.GetInvalidFileNameChars().Contains(c)));
                var removedBy = User.FindFirst(ClaimTypes.Email)?.Value ?? userId ?? "unknown";

                foreach (var image in images)
                {
                    var archivedPath = await _fileStorageService.ArchiveFileAsync(image.ImagePath, $"removed/{safeFolder}");
                    _mainDb.RemovedProductImages.Add(new RemovedProductImage
                    {
                        VendorId = vendorId,
                        VendorName = vendorName,
                        ProductId = id,
                        ProductName = product.Name,
                        OriginalImagePath = image.ImagePath,
                        ArchivedImagePath = archivedPath ?? image.ImagePath,
                        RemovedBy = removedBy,
                    });
                }
                vendorDb.ProductImages.RemoveRange(images);
            }

            await vendorDb.SaveChangesAsync();
            await _mainDb.SaveChangesAsync();

            _ = _searchService.DeleteDocumentAsync(id.ToString(), vendorId);

            _logger.LogInformation("Product deleted (soft): {ProductId} by user {UserId}", id, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Product deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting product with id {ProductId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // PUT: api/products/{id}/activate — reverses a soft delete, same cross-vendor-safe lookup
    [HttpPut("{id}/activate")]
    [Authorize]
    public async Task<IActionResult> ActivateProduct(int id, [FromQuery] string? v = null)
    {
        try
        {
            var productDetail = await _storefront.GetProductByIdAsync(id, v);
            var vendorId = productDetail?.VendorId;
            if (productDetail == null || string.IsNullOrEmpty(vendorId))
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (userRole == "Vendor" && vendorId != userId)
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "You can only manage your own products"
                });
            }

            await using var vendorDb = await _storefront.OpenVendorDbContextAsync(vendorId);
            var product = await vendorDb.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            product.IsActive = true;
            await vendorDb.SaveChangesAsync();

            _logger.LogInformation("Product reactivated: {ProductId} by user {UserId}", id, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Product activated"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating product with id {ProductId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // ========== IMAGE UPLOAD ENDPOINTS ==========

    // POST: api/products/{id}/images
    [HttpPost("{id}/images")]
    [Authorize]
    public async Task<IActionResult> UploadProductImage(int id, IFormFile image)
    {
        try
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Ownership check
            if (userRole == "Vendor" && product.VendorId != userId)
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "You can only manage images for your own products"
                });
            }

            // Validate image
            if (image == null || image.Length == 0)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Image is required"
                });
            }

            // Upload via LocalFileStorageService
            using var stream = image.OpenReadStream();
            var uploadResult = await _fileStorageService.UploadImageAsync(stream, image.FileName, "products");

            if (!uploadResult.Success || string.IsNullOrEmpty(uploadResult.FilePath))
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = uploadResult.Message ?? "Failed to upload image"
                });
            }

            // Create ProductImage entity
            var existingImages = await _productImageRepository.GetByProductIdAsync(id);
            var displayOrder = existingImages.Any() ? existingImages.Max(i => i.DisplayOrder) + 1 : 1;

            var productImage = new ProductImage
            {
                ProductId = id,
                ImagePath = uploadResult.FilePath,
                AltText = product.Name,
                DisplayOrder = displayOrder,
                CreatedAt = DateTime.UtcNow
            };

            await _productImageRepository.AddAsync(productImage);

            // Sync to Meilisearch — only update if this is the first image (becomes the primary)
            if (!existingImages.Any())
            {
                _ = _searchService.UpdateDocumentAsync(new SearchIndex
                {
                    Id       = product.Id.ToString(),
                    Type     = "Product",
                    Title    = product.Name,
                    Description = product.Description ?? "",
                    CategoryId  = product.CategoryId.ToString(),
                    Price       = product.Price,
                    DiscountPrice = product.DiscountPrice,
                    StockQuantity = product.StockQuantity,
                    IsActive    = product.IsActive,
                    VendorId    = product.VendorId,
                    ImageUrl    = productImage.ImagePath.Replace("\\", "/"),
                    Url         = $"/products/{product.Id}",
                    UpdatedAt   = DateTime.UtcNow,
                });
            }

            var imageDto = new ProductImageDto
            {
                Id = productImage.Id,
                ImageUrl = productImage.ImagePath,
                AltText = productImage.AltText,
                DisplayOrder = productImage.DisplayOrder
            };

            _logger.LogInformation("Image uploaded for product {ProductId}: {ImageId}", id, productImage.Id);

            return Ok(new ApiResponseDto<ProductImageDto>
            {
                Success = true,
                Message = "Image uploaded successfully",
                Data = imageDto
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image for product {ProductId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // DELETE: api/products/{id}/images/{imageId}
    // Resolves the product's REAL owner first and connects directly to that vendor's own
    // database — never relies on whichever DB the logged-in caller happens to be tied to.
    // This matters for Admin moderation actions, which act on a different vendor's data.
    [HttpDelete("{id}/images/{imageId}")]
    [Authorize]
    public async Task<IActionResult> DeleteProductImage(int id, int imageId, [FromQuery] string? v = null)
    {
        try
        {
            var productDetail = await _storefront.GetProductByIdAsync(id, v);
            var vendorId = productDetail?.VendorId;
            if (productDetail == null || string.IsNullOrEmpty(vendorId))
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product not found"
                });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Ownership check
            if (userRole == "Vendor" && vendorId != userId)
            {
                return StatusCode(403, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "You can only manage images for your own products"
                });
            }

            await using var vendorDb = await _storefront.OpenVendorDbContextAsync(vendorId);

            var image = await vendorDb.ProductImages.FirstOrDefaultAsync(i => i.Id == imageId && i.ProductId == id);
            if (image == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Image not found"
                });
            }

            var originalPath = image.ImagePath;

            // Archive the file instead of deleting it, so it can be recovered if needed
            var vendorUser = await _mainDb.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == vendorId);
            var vendorName = vendorUser?.UserName ?? vendorId;
            var safeFolder = string.Concat(vendorName.Where(c => !"@.".Contains(c) && !Path.GetInvalidFileNameChars().Contains(c)));
            var archivedPath = await _fileStorageService.ArchiveFileAsync(originalPath, $"removed/{safeFolder}");

            vendorDb.ProductImages.Remove(image);
            await vendorDb.SaveChangesAsync();

            // Log the audit record in the main DB — this is the part visible in the admin dashboard
            _mainDb.RemovedProductImages.Add(new RemovedProductImage
            {
                VendorId = vendorId,
                VendorName = vendorName,
                ProductId = id,
                ProductName = productDetail.Name,
                OriginalImagePath = originalPath,
                ArchivedImagePath = archivedPath ?? originalPath,
                RemovedBy = User.FindFirst(ClaimTypes.Email)?.Value ?? userId ?? "unknown",
            });
            await _mainDb.SaveChangesAsync();

            // Sync new primary image to Meilisearch
            var remainingImages = await vendorDb.ProductImages
                .Where(i => i.ProductId == id)
                .OrderBy(i => i.DisplayOrder)
                .ToListAsync();
            var product = await vendorDb.Products.FindAsync(id);
            if (product != null)
            {
                _ = _searchService.UpdateDocumentAsync(new SearchIndex
                {
                    Id       = product.Id.ToString(),
                    Type     = "Product",
                    Title    = product.Name,
                    Description = product.Description ?? "",
                    CategoryId  = product.CategoryId.ToString(),
                    Price       = product.Price,
                    DiscountPrice = product.DiscountPrice,
                    StockQuantity = product.StockQuantity,
                    IsActive    = product.IsActive,
                    VendorId    = product.VendorId,
                    ImageUrl    = (remainingImages.FirstOrDefault()?.ImagePath ?? "").Replace("\\", "/"),
                    Url         = $"/products/{product.Id}",
                    UpdatedAt   = DateTime.UtcNow,
                });
            }

            _logger.LogInformation("Image archived: {ImageId} from product {ProductId} by {UserId}", imageId, id, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Image removed"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting image {ImageId} from product {ProductId}", imageId, id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // ========== SEARCH ENDPOINTS ==========

    // GET: api/products/search
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> SearchProducts(
        [FromQuery] string query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] string? categoryIds = null)
    {
        try
        {
            var request = new SearchRequest
            {
                Query = query ?? "",
                Page = page,
                PageSize = pageSize,
                SortBy = sortBy ?? "relevance",
                MinPrice = minPrice,
                MaxPrice = maxPrice,
                Categories = categoryIds?.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList() ?? new List<string>()
            };

            var result = await _searchService.SearchAsync(request);

            return Ok(new ApiResponseDto<SearchResponse>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching products");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // GET: api/products/category/{categoryId}
    [HttpGet("category/{categoryId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProductsByCategory(int categoryId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var allProducts = await _productRepository.GetByCategoryAsync(categoryId);
            var totalCount = allProducts.Count();

            var products = allProducts
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new ProductListDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = p.Price,
                    CategoryName = "",
                    IsActive = p.IsActive
                })
                .ToList();

            var result = new PaginatedResultDto<ProductListDto>
            {
                Items = products,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };

            return Ok(new ApiResponseDto<PaginatedResultDto<ProductListDto>>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching products by category {CategoryId}", categoryId);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // GET: api/products/removed-images — audit log of images removed via moderation
    [HttpGet("removed-images")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetRemovedImages()
    {
        try
        {
            var records = await _mainDb.RemovedProductImages
                .AsNoTracking()
                .OrderByDescending(r => r.RemovedAt)
                .Take(200)
                .ToListAsync();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = records.Select(r => new
                {
                    id = r.Id,
                    vendorName = r.VendorName,
                    productId = r.ProductId,
                    productName = r.ProductName,
                    archivedImagePath = r.ArchivedImagePath,
                    removedBy = r.RemovedBy,
                    removedAt = r.RemovedAt
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching removed image records");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // POST: api/products/removed-images/{id}/restore — admin approves a removed image,
    // moving the file back into the vendor's product folder and re-adding it to that
    // vendor's own database so it's live on the storefront again.
    [HttpPost("removed-images/{id}/restore")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> RestoreRemovedImage(int id)
    {
        try
        {
            var record = await _mainDb.RemovedProductImages.FindAsync(id);
            if (record == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Removed-image record not found"
                });
            }

            await using var vendorDb = await _storefront.OpenVendorDbContextAsync(record.VendorId);
            var product = await vendorDb.Products.FindAsync(record.ProductId);
            if (product == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Product no longer exists in the vendor's database"
                });
            }

            var restoredPath = await _fileStorageService.ArchiveFileAsync(record.ArchivedImagePath, "products");
            if (restoredPath == null)
            {
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Could not restore the archived file"
                });
            }

            var maxOrder = await vendorDb.ProductImages
                .Where(i => i.ProductId == record.ProductId)
                .MaxAsync(i => (int?)i.DisplayOrder) ?? -1;

            vendorDb.ProductImages.Add(new ProductImage
            {
                ProductId    = record.ProductId,
                ImagePath    = restoredPath,
                VendorId     = record.VendorId,
                DisplayOrder = maxOrder + 1,
            });
            await vendorDb.SaveChangesAsync();

            _mainDb.RemovedProductImages.Remove(record);
            await _mainDb.SaveChangesAsync();

            var images = await vendorDb.ProductImages
                .Where(i => i.ProductId == record.ProductId)
                .OrderBy(i => i.DisplayOrder)
                .ToListAsync();
            _ = _searchService.UpdateDocumentAsync(new SearchIndex
            {
                Id       = product.Id.ToString(),
                Type     = "Product",
                Title    = product.Name,
                Description = product.Description ?? "",
                CategoryId  = product.CategoryId.ToString(),
                Price       = product.Price,
                DiscountPrice = product.DiscountPrice,
                StockQuantity = product.StockQuantity,
                IsActive    = product.IsActive,
                VendorId    = product.VendorId,
                ImageUrl    = (images.FirstOrDefault()?.ImagePath ?? "").Replace("\\", "/"),
                Url         = $"/products/{product.Id}",
                UpdatedAt   = DateTime.UtcNow,
            });

            _logger.LogInformation("Image restored: record {RecordId} for product {ProductId} by {UserId}",
                id, record.ProductId, User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Image restored and back on the storefront"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring removed image record {RecordId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    // Checks a product's name/description against the banned-word list and the vendor's trust
    // status. Returns the reason to flag it for review, or null if it can go live immediately.
    private async Task<(ModerationReason? Reason, string? Detail)> CheckModerationAsync(string vendorId, string name, string? description)
    {
        var tenant = await _mainDb.TenantRegistrations.FirstOrDefaultAsync(t => t.VendorId == vendorId);
        if (tenant != null && tenant.RequiresApproval)
            return (ModerationReason.NewVendorReview, "Vendor does not yet have trusted status — pending first review.");

        var bannedWords = await _mainDb.BannedWords.Select(w => w.Word).ToListAsync();
        var haystack = $"{name} {description}".ToLowerInvariant();
        var hit = bannedWords.FirstOrDefault(w => haystack.Contains(w.ToLowerInvariant()));
        if (hit != null)
            return (ModerationReason.BannedWord, $"Matched banned word: \"{hit}\"");

        return (null, null);
    }

    private async Task FlagProductAsync(string vendorId, int productId, ModerationReason reason, string? detail)
    {
        _mainDb.ModerationFlags.Add(new ModerationFlag
        {
            VendorId = vendorId,
            ProductId = productId,
            Reason = reason,
            Detail = detail,
            Status = ModerationStatus.Pending,
        });
        await _mainDb.SaveChangesAsync();
    }
}
