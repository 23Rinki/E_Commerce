using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Application.DTOs.Product;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.Infrastructure.Services;

/// <summary>
/// Reads products across ALL vendor databases so the customer-facing storefront
/// shows every vendor's catalogue in one combined list.
///
/// Phase 2 multi-tenant design:
///   - Each vendor's TenantRegistration.RailwayDatabaseUrl points to their own DB.
///   - Vendors without a dedicated URL share the default VendorConnection DB.
///   - Distinct connection strings are queried once; shared-DB vendors are naturally
///     aggregated in a single query (their products are in the same DB).
/// </summary>
public class StorefrontProductsService
{
    private readonly ApplicationDbContext _mainDb;
    private readonly string _defaultConnStr;
    private readonly ILogger<StorefrontProductsService> _logger;

    public StorefrontProductsService(
        ApplicationDbContext mainDb,
        IConfiguration config,
        ILogger<StorefrontProductsService> logger)
    {
        _mainDb = mainDb;
        _defaultConnStr = config.GetConnectionString("VendorConnection")
            ?? config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("VendorConnection not configured.");
        _logger = logger;
    }

    // ── Collect the set of unique vendor DB connection strings ────────────────

    // Extracts the Database= value so deduplication works even when connection
    // strings differ by whitespace, SslMode, or parameter order.
    private static string DedupeKey(string connStr)
    {
        foreach (var segment in connStr.Split(';'))
        {
            var kv = segment.Trim().Split('=', 2);
            if (kv.Length == 2 && kv[0].Trim().Equals("Database", StringComparison.OrdinalIgnoreCase))
                return kv[1].Trim().ToLowerInvariant();
        }
        return connStr.Trim().ToLowerInvariant();
    }

    // Public wrapper so other services (e.g. order lookup, which must scan every vendor's
    // database the same way the storefront does) can reuse this without duplicating it.
    // Suspended vendors are still included here — a customer's past order history from a
    // since-suspended vendor must stay visible.
    public Task<List<string>> GetAllVendorConnectionStringsAsync() => UniqueConnectionStringsAsync(excludeSuspended: false);

    // excludeSuspended: true for customer-facing browsing/search, so a vendor whose payment
    // is overdue disappears from the storefront without affecting existing orders/carts.
    private async Task<List<string>> UniqueConnectionStringsAsync(bool excludeSuspended = false)
    {
        var tenants = await _mainDb.TenantRegistrations.AsNoTracking().ToListAsync();

        var seenDbs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result  = new List<string>();

        // Always include the default shared DB first
        if (seenDbs.Add(DedupeKey(_defaultConnStr))) result.Add(_defaultConnStr);

        // Add any dedicated DBs registered by vendors
        foreach (var t in tenants)
        {
            if (excludeSuspended && t.Status == Domain.Enums.TenantStatus.Suspended)
                continue;

            var url = t.RailwayDatabaseUrl?.Trim();
            if (!string.IsNullOrWhiteSpace(url) && seenDbs.Add(DedupeKey(url)))
                result.Add(url);
        }

        return result;
    }

    // ── Get all products (paginated) across all vendor DBs ───────────────────

    public async Task<(List<ProductListDto> Items, int TotalCount)> GetAllProductsAsync(
        int page, int pageSize, string? categoryName = null, bool includeInactive = false, bool excludeSuspended = true,
        string? sortBy = null, bool sortDesc = true, decimal? minPrice = null, decimal? maxPrice = null)
    {
        var connStrings  = await UniqueConnectionStringsAsync(excludeSuspended);
        var allProducts  = new List<ProductListDto>();
        var filterByName = !string.IsNullOrWhiteSpace(categoryName);

        foreach (var connStr in connStrings)
        {
            try
            {
                var opts = new DbContextOptionsBuilder<VendorDbContext>()
                    .UseNpgsql(connStr).Options;
                await using var ctx = new VendorDbContext(opts);

                // Resolve category name → local ID for this vendor DB
                int? localCategoryId = null;
                if (filterByName)
                {
                    var cat = await ctx.Categories.AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Name.ToLower() == categoryName!.ToLower());
                    if (cat == null) continue; // this vendor has no such category
                    localCategoryId = cat.Id;
                }

                var query = ctx.Products.AsNoTracking().AsQueryable();
                if (!includeInactive)
                    query = query.Where(p => p.IsActive);
                if (localCategoryId.HasValue)
                    query = query.Where(p => p.CategoryId == localCategoryId.Value);

                var products = await query.ToListAsync();

                if (products.Count == 0) continue;

                var ids = products.Select(p => p.Id).ToList();

                // Primary image per product (lowest DisplayOrder wins)
                var imageMap = await ctx.ProductImages
                    .AsNoTracking()
                    .Where(i => ids.Contains(i.ProductId))
                    .GroupBy(i => i.ProductId)
                    .Select(g => new {
                        ProductId = g.Key,
                        Id        = g.OrderBy(i => i.DisplayOrder).First().Id,
                        Path      = g.OrderBy(i => i.DisplayOrder).First().ImagePath
                    })
                    .ToDictionaryAsync(x => x.ProductId, x => x);

                var catIds = products.Select(p => p.CategoryId).Distinct().ToList();
                var catMap = await ctx.Categories
                    .AsNoTracking()
                    .Where(c => catIds.Contains(c.Id))
                    .ToDictionaryAsync(c => c.Id, c => c.Name);

                allProducts.AddRange(products.Select(p => new ProductListDto
                {
                    Id              = p.Id,
                    Name            = p.Name,
                    Price           = p.Price,
                    DiscountPrice   = p.DiscountPrice,
                    CategoryId      = p.CategoryId,
                    CategoryName    = catMap.TryGetValue(p.CategoryId, out var cn) ? cn : "",
                    IsActive        = p.IsActive,
                    PrimaryImageUrl = imageMap.TryGetValue(p.Id, out var img) ? img.Path : null,
                    PrimaryImageId  = imageMap.TryGetValue(p.Id, out var img2) ? img2.Id : null,
                    StockQuantity   = p.StockQuantity,
                    VendorId        = p.VendorId,
                }));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Storefront: could not query vendor DB (first 60 chars: {Conn})",
                    connStr.Length > 60 ? connStr[..60] : connStr);
            }
        }

        // Resolve vendor names in one batch from the main DB
        var vendorIds = allProducts
            .Where(p => !string.IsNullOrEmpty(p.VendorId))
            .Select(p => p.VendorId!)
            .Distinct()
            .ToList();

        if (vendorIds.Count > 0)
        {
            var nameMap = await _mainDb.Users
                .AsNoTracking()
                .Where(u => vendorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.UserName ?? "");

            foreach (var p in allProducts)
                if (!string.IsNullOrEmpty(p.VendorId) && nameMap.TryGetValue(p.VendorId, out var vn))
                    p.VendorName = vn;
        }

        // Price filter on what the shopper actually pays (discount price when there is one)
        static decimal Effective(ProductListDto p) =>
            p.DiscountPrice is > 0 && p.DiscountPrice < p.Price ? p.DiscountPrice.Value : p.Price;
        IEnumerable<ProductListDto> filtered = allProducts;
        if (minPrice.HasValue) filtered = filtered.Where(p => Effective(p) >= minPrice.Value);
        if (maxPrice.HasValue) filtered = filtered.Where(p => Effective(p) <= maxPrice.Value);

        // Global sort (default: newest / highest ID first), then paginate
        var sorted = (sortBy?.ToLowerInvariant() switch
        {
            "price" => sortDesc ? filtered.OrderByDescending(Effective) : filtered.OrderBy(Effective),
            "name"  => sortDesc ? filtered.OrderByDescending(p => p.Name) : filtered.OrderBy(p => p.Name),
            _       => filtered.OrderByDescending(p => p.Id),
        }).ToList();
        var totalCount = sorted.Count;
        var paged      = sorted.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return (paged, totalCount);
    }

    // ── Search corpus: every active storefront product plus its description ──

    public sealed record SearchableProduct(
        int Id, string Name, string? Description, string CategoryName, decimal Price, decimal? DiscountPrice,
        int StockQuantity, string? PrimaryImageUrl, string? VendorId, string VendorName);

    public async Task<List<SearchableProduct>> GetSearchableProductsAsync()
    {
        var (products, _) = await GetAllProductsAsync(1, int.MaxValue);

        // Descriptions aren't part of the list DTO, so fetch them separately (id → text per vendor)
        var descriptions = new Dictionary<(string, int), string>();
        foreach (var connStr in await UniqueConnectionStringsAsync(excludeSuspended: true))
        {
            try
            {
                var opts = new DbContextOptionsBuilder<VendorDbContext>().UseNpgsql(connStr).Options;
                await using var ctx = new VendorDbContext(opts);
                var rows = await ctx.Products.AsNoTracking()
                    .Where(p => p.IsActive)
                    .Select(p => new { p.Id, p.VendorId, p.ShortDescription, p.Description })
                    .ToListAsync();
                foreach (var r in rows)
                    descriptions[(r.VendorId ?? "", r.Id)] = $"{r.ShortDescription} {r.Description}".Trim();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Search corpus: could not read descriptions from a vendor DB");
            }
        }

        return products.Select(p => new SearchableProduct(
            p.Id, p.Name,
            descriptions.TryGetValue((p.VendorId ?? "", p.Id), out var d) ? d : null,
            p.CategoryName, p.Price, p.DiscountPrice, p.StockQuantity, p.PrimaryImageUrl, p.VendorId, p.VendorName)).ToList();
    }

    // ── Get all unique active categories across all vendor DBs ───────────────

    public async Task<List<string>> GetAllCategoryNamesAsync()
    {
        var connStrings = await UniqueConnectionStringsAsync(excludeSuspended: true);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new List<string>();

        foreach (var connStr in connStrings)
        {
            try
            {
                var opts = new DbContextOptionsBuilder<VendorDbContext>()
                    .UseNpgsql(connStr).Options;
                await using var ctx = new VendorDbContext(opts);

                var names = await ctx.Categories
                    .AsNoTracking()
                    .Where(c => c.IsActive)
                    .Select(c => c.Name)
                    .ToListAsync();

                foreach (var name in names)
                    if (seen.Add(name))
                        result.Add(name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Storefront categories: could not query vendor DB");
            }
        }

        return result.OrderBy(n => n).ToList();
    }

    // ── Resolve and open a specific vendor's own database ─────────────────────
    // Used by moderation actions (remove image, deactivate product, etc.) so they
    // always operate on the product's actual owner, never on whoever is logged in.

    public async Task<string> GetVendorConnectionStringAsync(string vendorId)
    {
        var tenant = await _mainDb.TenantRegistrations
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.VendorId == vendorId);

        return !string.IsNullOrEmpty(tenant?.RailwayDatabaseUrl)
            ? tenant.RailwayDatabaseUrl
            : _defaultConnStr;
    }

    public async Task<VendorDbContext> OpenVendorDbContextAsync(string vendorId)
    {
        var connStr = await GetVendorConnectionStringAsync(vendorId);
        var opts = new DbContextOptionsBuilder<VendorDbContext>().UseNpgsql(connStr).Options;
        return new VendorDbContext(opts);
    }

    // ── Get a single product by ID, searching all vendor DBs ─────────────────

    public async Task<ProductDetailsDto?> GetProductByIdAsync(int id, string? vendorId = null)
    {
        var connStrings = await UniqueConnectionStringsAsync();

        // If vendorId is known, resolve their connection string and try it first
        if (!string.IsNullOrEmpty(vendorId))
        {
            var tenant = await _mainDb.TenantRegistrations
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.VendorId == vendorId);

            var targetConn = !string.IsNullOrEmpty(tenant?.RailwayDatabaseUrl)
                ? tenant.RailwayDatabaseUrl
                : _defaultConnStr;

            var hit = await QueryProductAsync(id, targetConn);
            if (hit != null) return hit;
        }

        // Fall back to searching all DBs in order
        foreach (var connStr in connStrings)
            if (await QueryProductAsync(id, connStr) is { } result)
                return result;

        return null;
    }

    private async Task<ProductDetailsDto?> QueryProductAsync(int id, string connStr)
    {
        try
        {
            var opts = new DbContextOptionsBuilder<VendorDbContext>()
                .UseNpgsql(connStr).Options;
            await using var ctx = new VendorDbContext(opts);

            var product = await ctx.Products.FindAsync(id);
            if (product == null) return null;

            var images = await ctx.ProductImages
                .AsNoTracking()
                .Where(i => i.ProductId == id)
                .OrderBy(i => i.DisplayOrder)
                .ToListAsync();

            var category = await ctx.Categories.FindAsync(product.CategoryId);

            var vendor = await _mainDb.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == product.VendorId);

            return new ProductDetailsDto
            {
                Id            = product.Id,
                Name          = product.Name,
                Description   = product.Description,
                Price         = product.Price,
                DiscountPrice = product.DiscountPrice,
                StockQuantity = product.StockQuantity,
                CategoryName  = category?.Name ?? "",
                VendorName    = vendor?.UserName ?? "",
                VendorId      = product.VendorId,
                ImageUrls     = images.Select(i => i.ImagePath).ToList(),
                Images        = images.Select(i => new ProductImageRefDto { Id = i.Id, ImagePath = i.ImagePath }).ToList(),
                AverageRating = 0,
                ReviewCount   = 0,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Storefront: error querying vendor DB for product {Id}", id);
            return null;
        }
    }
}
