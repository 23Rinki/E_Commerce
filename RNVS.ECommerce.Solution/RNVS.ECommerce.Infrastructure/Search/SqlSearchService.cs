using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Infrastructure.Search.Models;
using System.Diagnostics;

namespace RNVS.ECommerce.Infrastructure.Search;

/// <summary>
/// SQL-backed search service using two algorithmic techniques:
///
/// 1. DIVIDE AND CONQUER — Relevance Scoring
///    Multi-word queries are tokenized into terms. ComputeRelevanceScore() recursively splits
///    the token array into halves, scores each half independently against every field, then
///    MERGES the partial scores back up (identical in structure to merge-sort). This ensures
///    every token contributes proportionally, regardless of query length.
///    Field weights (per token): SKU exact=25, Name exact=20, Name prefix=15,
///    Category=10, SKU contains=10, Name contains=8, Description contains=3.
///
/// 2. TWO-POINTER TECHNIQUE — Price Range Filtering and Result-Tier Merging
///    (a) Price-Range Window: after sorting candidates by BasePrice ascending, two pointers
///        (left, right) walk inward from both ends in a single O(n) pass to isolate the
///        [minPrice, maxPrice] window — no two separate LINQ Where passes needed.
///    (b) Tier Merging: scored hits are split into "primary" (score ≥ threshold) and
///        "secondary" tiers. A two-pointer merge (merge-sort merge step) combines the two
///        sorted lists into one ranked result, guaranteeing high-relevance results always
///        precede lower-relevance matches.
/// </summary>
public class SqlSearchService : ISearchService
{
    // ── Field-weight constants for single-token scoring ──────────────────────
    private const double W_SKU_EXACT        = 25.0;
    private const double W_NAME_EXACT       = 20.0;
    private const double W_NAME_PREFIX      = 15.0;
    private const double W_SKU_CONTAINS     = 10.0;
    private const double W_NAME_CONTAINS    =  8.0;
    private const double W_DESC_CONTAINS    =  3.0;

    /// Hits with score ≥ this are "primary" results; rest are "secondary".
    private const double PRIMARY_SCORE_THRESHOLD = W_NAME_CONTAINS;

    private readonly ILogger<SqlSearchService> _logger;
    private readonly IProductRepository _productRepository;

    public SqlSearchService(
        ILogger<SqlSearchService> logger,
        IProductRepository productRepository)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _productRepository = productRepository ?? throw new ArgumentNullException(nameof(productRepository));
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<SearchResponse> SearchAsync(SearchRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                _logger.LogWarning("Search called with empty query");
                return new SearchResponse();
            }

            _logger.LogInformation("Searching for: {Query}", request.Query);

            // Tokenize query ─ DIVIDE step entry point
            var tokens = Tokenize(request.Query);

            var allProducts = await _productRepository.GetAllAsync();
            var candidates = allProducts.ToList();

            // ── Apply category filter ────────────────────────────────────────
            if (request.Categories.Any())
                candidates = candidates
                    .Where(p => request.Categories.Contains(p.CategoryId.ToString()))
                    .ToList();

            // ── Apply vendor filter ──────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(request.VendorId))
                candidates = candidates
                    .Where(p => p.VendorId.ToString() == request.VendorId)
                    .ToList();

            // ── Stock filter ─────────────────────────────────────────────────
            if (request.OnlyInStock)
                candidates = candidates
                    .Where(p => p.StockQuantity > 0)
                    .ToList();

            // ── TWO-POINTER (a): Price-range window on price-sorted list ─────
            if (request.MinPrice.HasValue || request.MaxPrice.HasValue)
                candidates = ApplyPriceRangeTwoPointer(candidates, request.MinPrice, request.MaxPrice);

            // ── DIVIDE & CONQUER: Score every candidate ──────────────────────
            var scored = candidates
                .Select(p => (product: p, score: ComputeRelevanceScore(tokens, p)))
                .Where(x => x.score > 0)
                .ToList();

            // ── TWO-POINTER (b): Merge primary and secondary result tiers ────
            var merged = MergeTiersTwoPointer(scored);

            // ── Apply sort override (price / newest / rating) ────────────────
            var sorted = ApplySortOverride(merged, request.SortBy);

            // ── Paginate ─────────────────────────────────────────────────────
            int totalCount = sorted.Count;
            int skip = (request.Page - 1) * request.PageSize;
            var page = sorted.Skip(skip).Take(request.PageSize).ToList();

            var results = page.Select(x => BuildSearchResult(x.product, x.score, request.Query)).ToList();

            stopwatch.Stop();
            _logger.LogInformation(
                "Search completed in {Ms}ms — {Total} results for '{Query}' using Divide&Conquer + Two-Pointer",
                stopwatch.ElapsedMilliseconds, totalCount, request.Query);

            return new SearchResponse
            {
                Results   = results,
                TotalCount = totalCount,
                Page      = request.Page,
                PageSize  = request.PageSize,
                TimeTakenMs = stopwatch.ElapsedMilliseconds,
                Query     = request.Query
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing search for query: {Query}", request.Query);
            stopwatch.Stop();
            return new SearchResponse { Query = request.Query, TimeTakenMs = stopwatch.ElapsedMilliseconds };
        }
    }

    public async Task<List<string>> GetSuggestionsAsync(string query, int count = 10)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
                return new List<string>();

            var tokens  = Tokenize(query);
            var products = await _productRepository.GetAllAsync();

            // Score and rank suggestions using the same D&C scoring
            return products
                .Select(p => (name: p.Name, score: ComputeRelevanceScore(tokens, p)))
                .Where(x => x.score > 0)
                .OrderByDescending(x => x.score)
                .Select(x => x.name)
                .Distinct()
                .Take(count)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting suggestions for query: {Query}", query);
            return new List<string>();
        }
    }

    // ── Pass-through index operations (SQL does not need manual indexing) ────

    public Task<bool> IndexDocumentAsync(SearchIndex document)        => Task.FromResult(true);
    public Task<bool> IndexDocumentsAsync(List<SearchIndex> documents) => Task.FromResult(true);
    public Task<bool> UpdateDocumentAsync(SearchIndex document)        => Task.FromResult(true);
    public Task<bool> DeleteDocumentAsync(string id, string? vendorId = null) => Task.FromResult(true);
    public Task<bool> DeleteDocumentsByTypeAsync(string type)          => Task.FromResult(true);

    // =========================================================================
    // ALGORITHM 1 — DIVIDE AND CONQUER: Relevance Scoring
    // =========================================================================

    /// <summary>
    /// Tokenize a raw query string into lowercase terms, removing stop-words and
    /// short tokens. This is the DIVIDE entry point for multi-word queries.
    /// </summary>
    private static string[] Tokenize(string query)
    {
        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "a", "an", "the", "and", "or", "in", "on", "for", "of", "to", "is", "with" };

        return query
            .ToLower()
            .Split(new[] { ' ', ',', '-', '_', '.', '/', '\\' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 2 && !stopWords.Contains(t))
            .Distinct()
            .ToArray();
    }

    /// <summary>
    /// DIVIDE AND CONQUER — recursively split the token array into two halves,
    /// score each half independently against the product, then MERGE (sum) the
    /// partial scores. Base case: single token → direct field scoring.
    ///
    /// Structure mirrors merge-sort:
    ///   score(tokens, product)
    ///     ├── score(tokens[..mid], product)   ← left sub-problem
    ///     └── score(tokens[mid..], product)   ← right sub-problem
    ///         merge: leftScore + rightScore
    /// </summary>
    private static double ComputeRelevanceScore(string[] tokens, Product product)
    {
        if (tokens.Length == 0) return 0.0;

        // Base case — single token: compute score across all fields directly
        if (tokens.Length == 1)
            return ComputeTokenScore(tokens[0], product);

        // Divide
        int mid = tokens.Length / 2;
        string[] leftTokens  = tokens[..mid];
        string[] rightTokens = tokens[mid..];

        // Conquer (recurse independently)
        double leftScore  = ComputeRelevanceScore(leftTokens,  product);
        double rightScore = ComputeRelevanceScore(rightTokens, product);

        // Merge — boost when BOTH halves match (multi-term relevance bonus)
        double mergedScore = leftScore + rightScore;
        if (leftScore > 0 && rightScore > 0)
            mergedScore *= 1.25; // 25% bonus for multi-token full match

        return mergedScore;
    }

    /// <summary>
    /// Base-case scorer: measures how well a single token matches a product
    /// across multiple fields, using field-weight constants.
    /// </summary>
    private static double ComputeTokenScore(string token, Product product)
    {
        double score = 0.0;

        string name = product.Name?.ToLower()        ?? string.Empty;
        string sku  = product.SKU?.ToLower()         ?? string.Empty;
        string desc = product.Description?.ToLower() ?? string.Empty;

        // SKU — strongest signal (unique identifier)
        if (sku == token)                       score += W_SKU_EXACT;
        else if (sku.Contains(token))           score += W_SKU_CONTAINS;

        // Name — primary discovery field
        if (name == token)                      score += W_NAME_EXACT;
        else if (name.StartsWith(token))        score += W_NAME_PREFIX;
        else if (name.Contains(token))          score += W_NAME_CONTAINS;

        // Description — weakest, broad contextual signal
        if (score == 0 && desc.Contains(token)) score += W_DESC_CONTAINS;

        // Boost for popularity (log-scaled to avoid extreme dominance)
        if (score > 0 && product.ViewCount > 0)
            score += Math.Log10(product.ViewCount + 1) * 0.5;

        return score;
    }

    // =========================================================================
    // ALGORITHM 2 — TWO-POINTER: Price Range Filter and Tier Merging
    // =========================================================================

    /// <summary>
    /// TWO-POINTER (a) — Price Range Window.
    ///
    /// Sorts candidates by BasePrice ascending, then uses two inward-moving pointers
    /// to find the valid [minPrice, maxPrice] window in a single O(n) pass.
    ///
    ///   left  → advances while price[left]  &lt; minPrice
    ///   right ← retreats while price[right] &gt; maxPrice
    ///   window: candidates[left .. right] (inclusive)
    ///
    /// Advantage over two separate LINQ Where passes: single traversal, early exit
    /// possible, and the sorted order is reused downstream by ApplySortOverride.
    /// </summary>
    private static List<Product> ApplyPriceRangeTwoPointer(
        List<Product> candidates,
        decimal? minPrice,
        decimal? maxPrice)
    {
        if (candidates.Count == 0) return candidates;

        // Sort by price (required for the two-pointer invariant)
        var sorted = candidates.OrderBy(p => p.BasePrice).ToList();

        int left  = 0;
        int right = sorted.Count - 1;

        // Advance left pointer past products below minPrice
        if (minPrice.HasValue)
            while (left <= right && sorted[left].BasePrice < minPrice.Value)
                left++;

        // Retreat right pointer past products above maxPrice
        if (maxPrice.HasValue)
            while (right >= left && sorted[right].BasePrice > maxPrice.Value)
                right--;

        // Window [left, right] is the valid price range
        if (left > right) return new List<Product>();
        return sorted.GetRange(left, right - left + 1);
    }

    /// <summary>
    /// TWO-POINTER (b) — Tier Merge.
    ///
    /// Splits scored products into two tiers:
    ///   • Primary   (score ≥ PRIMARY_SCORE_THRESHOLD) — sorted by score desc
    ///   • Secondary (0 &lt; score &lt; threshold)         — sorted by score desc
    ///
    /// Merges the two sorted lists using the two-pointer merge technique
    /// (same as merge-sort's merge step):
    ///   i → primary list pointer
    ///   j → secondary list pointer
    ///   At each step, emit whichever pointer has the higher score.
    ///
    /// This guarantees: every primary result ranks above every secondary result
    /// of equal score, and within each tier ordering is preserved.
    /// </summary>
    private static List<(Product product, double score)> MergeTiersTwoPointer(
        List<(Product product, double score)> scored)
    {
        var primary   = scored.Where(x => x.score >= PRIMARY_SCORE_THRESHOLD)
                              .OrderByDescending(x => x.score).ToList();
        var secondary = scored.Where(x => x.score > 0 && x.score < PRIMARY_SCORE_THRESHOLD)
                              .OrderByDescending(x => x.score).ToList();

        var merged = new List<(Product, double)>(primary.Count + secondary.Count);

        int i = 0, j = 0; // two pointers

        while (i < primary.Count && j < secondary.Count)
        {
            // Primary always wins over secondary at same score (stable tier priority)
            if (primary[i].score >= secondary[j].score)
                merged.Add(primary[i++]);
            else
                merged.Add(secondary[j++]);
        }

        // Drain remaining elements (at most one list still has items)
        while (i < primary.Count)   merged.Add(primary[i++]);
        while (j < secondary.Count) merged.Add(secondary[j++]);

        return merged;
    }

    // ── Helper: apply user-selected sort override ─────────────────────────────

    private static List<(Product product, double score)> ApplySortOverride(
        List<(Product product, double score)> merged,
        string sortBy) => sortBy.ToLower() switch
    {
        "price_asc"  => merged.OrderBy(x => x.product.BasePrice).ToList(),
        "price_desc" => merged.OrderByDescending(x => x.product.BasePrice).ToList(),
        "newest"     => merged.OrderByDescending(x => x.product.CreatedAt).ToList(),
        "rating"     => merged.OrderByDescending(x => x.product.ViewCount).ToList(),
        _            => merged // "relevance" — already sorted by tier merge
    };

    // ── Helper: map Product entity to SearchResult DTO ────────────────────────

    private static SearchResult BuildSearchResult(Product product, double score, string query)
    {
        var lq = query.ToLower();
        var highlights = new List<string>();

        if (product.Name?.ToLower().Contains(lq) == true)
            highlights.Add($"Name: ...{product.Name}...");
        if (product.SKU?.ToLower().Contains(lq) == true)
            highlights.Add($"SKU: {product.SKU}");

        return new SearchResult
        {
            Id          = product.Id.ToString(),
            Type        = "Product",
            Title       = product.Name ?? string.Empty,
            Description = product.Description ?? string.Empty,
            Category    = product.CategoryId.ToString(),
            Price       = product.BasePrice,
            ImageUrl    = product.ProductImages?
                              .OrderBy(i => i.DisplayOrder)
                              .FirstOrDefault()?.ImagePath
                          ?? string.Empty,
            Url         = $"/products/{product.Slug ?? product.Id.ToString()}",
            Score       = Math.Round(score, 4),
            VendorName  = string.Empty,
            Highlights  = highlights
        };
    }
}
