using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RNVS.ECommerce.Infrastructure.Search;
using RNVS.ECommerce.Infrastructure.Search.Models;
using RNVS.ECommerce.Infrastructure.Services;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;
    private readonly StorefrontProductsService _storefront;
    private readonly ILogger<SearchController> _logger;

    public SearchController(
        ISearchService searchService,
        StorefrontProductsService storefront,
        ILogger<SearchController> logger)
    {
        _searchService = searchService;
        _storefront    = storefront;
        _logger        = logger;
    }

    [HttpGet("products")]
    [AllowAnonymous]
    public async Task<IActionResult> SearchProducts(
        [FromQuery] string query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? categoryId = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] double? minRating = null,
        [FromQuery] string sortBy = "relevance",
        [FromQuery] bool onlyInStock = false,
        [FromQuery] string? vendorId = null)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest(new { success = false, message = "Query cannot be empty" });

        var request = new SearchRequest
        {
            Query       = query,
            Page        = Math.Max(1, page),
            PageSize    = Math.Clamp(pageSize, 1, 100),
            Categories  = string.IsNullOrWhiteSpace(categoryId)
                            ? new List<string>()
                            : new List<string> { categoryId },
            MinPrice    = minPrice,
            MaxPrice    = maxPrice,
            MinRating   = minRating,
            SortBy      = sortBy,
            OnlyInStock = onlyInStock,
            VendorId    = vendorId ?? string.Empty,
        };

        var response = await _searchService.SearchAsync(request);

        return Ok(new
        {
            success     = true,
            data        = response.Results,
            totalCount  = response.TotalCount,
            page        = response.Page,
            pageSize    = response.PageSize,
            timeTakenMs = response.TimeTakenMs,
            query       = response.Query,
        });
    }

    [HttpGet("suggestions")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSuggestions(
        [FromQuery] string query,
        [FromQuery] int count = 10)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            return Ok(new { success = true, data = Array.Empty<string>() });

        var suggestions = await _searchService.GetSuggestionsAsync(query, Math.Clamp(count, 1, 20));
        return Ok(new { success = true, data = suggestions });
    }

    /// <summary>
    /// Full reindex — pushes all active products from DB into Meilisearch.
    /// Call this once after setting up Meilisearch or after bulk product imports.
    /// </summary>
    [HttpPost("reindex")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> ReindexAll()
    {
        try
        {
            // Pull all active products from EVERY vendor DB via StorefrontProductsService
            var (allProducts, _) = await _storefront.GetAllProductsAsync(1, 100_000);

            var documents = allProducts.Select(p => new SearchIndex
            {
                Id            = $"{p.VendorId ?? "default"}_{p.Id}",
                ProductId     = p.Id.ToString(),
                Type          = "Product",
                Title         = p.Name,
                Description   = "",
                Category      = p.CategoryName ?? "",
                CategoryId    = p.CategoryId.ToString(),
                Price         = p.Price,
                DiscountPrice = p.DiscountPrice,
                StockQuantity = p.StockQuantity,
                IsActive      = p.IsActive,
                VendorId      = p.VendorId ?? "",
                VendorName    = p.VendorName,
                CreatedAt     = DateTime.UtcNow,
                UpdatedAt     = DateTime.UtcNow,
                ImageUrl      = (p.PrimaryImageUrl ?? "").Replace("\\", "/"),
                Url           = $"/products/{p.Id}",
            }).ToList();

            var success = await _searchService.IndexDocumentsAsync(documents);

            _logger.LogInformation("Reindex completed: {Count} products pushed to Meilisearch from all vendor DBs", documents.Count);

            return Ok(new { success, count = documents.Count, message = $"{documents.Count} products indexed from all vendor databases" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reindex failed");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}
