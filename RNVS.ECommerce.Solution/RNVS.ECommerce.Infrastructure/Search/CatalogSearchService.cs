using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Infrastructure.Search.Models;
using RNVS.ECommerce.Infrastructure.Services;

namespace RNVS.ECommerce.Infrastructure.Search;

/// <summary>
/// Database-backed product search across every vendor DB. Used when Meilisearch is
/// unavailable or returns nothing, so storefront search never silently comes back empty.
///
/// Matching is word-based: each query word must match a word in the product's name,
/// category or description, either exactly, as a prefix ("wire" → "wireless"), via a
/// synonym ("car" → "vehicle", "suv"), or with one typo for longer words.
/// </summary>
public class CatalogSearchService
{
    private const string CacheKey = "catalog-search-corpus";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(2);
    private static readonly Regex WordSplit = new(@"[^\p{L}\p{N}]+", RegexOptions.Compiled);

    // Shoppers' words → words that actually appear in product data. Applied both ways at lookup.
    private static readonly Dictionary<string, string[]> Synonyms = new(StringComparer.OrdinalIgnoreCase)
    {
        ["car"]        = new[] { "suv", "sedan", "hatchback", "truck", "minivan", "coupe", "jeep" },
        ["bike"]       = new[] { "motorcycle", "motorbike", "sportbike", "scooter", "bicycle", "cycle" },
        ["motorcycle"] = new[] { "bike", "motorbike" },
        ["vehicle"]    = new[] { "car", "automotive", "motorcycle" },
        ["phone"]      = new[] { "mobile", "smartphone", "iphone" },
        ["mobile"]     = new[] { "phone", "smartphone" },
        ["laptop"]     = new[] { "notebook", "macbook", "computer" },
        ["tv"]         = new[] { "television" },
        ["watch"]      = new[] { "watches", "smartwatch" },
        ["shoe"]       = new[] { "shoes", "footwear", "sneaker", "sneakers" },
        ["sneaker"]    = new[] { "shoe", "footwear" },
        ["shirt"]      = new[] { "tshirt", "top", "tee" },
        ["perfume"]    = new[] { "fragrance", "fragrances" },
        ["makeup"]     = new[] { "cosmetics", "lipstick", "mascara" },
        ["dress"]      = new[] { "frock", "gown" },
        ["frock"]      = new[] { "dress" },
        ["sofa"]       = new[] { "couch" },
        ["couch"]      = new[] { "sofa" },
        ["fridge"]     = new[] { "refrigerator" },
        ["headphone"]  = new[] { "headphones", "earphones", "earbuds", "headset" },
        ["earphone"]   = new[] { "earphones", "earbuds", "headphones" },
        ["bag"]        = new[] { "bags", "handbag", "backpack", "luggage" },
        ["glasses"]    = new[] { "sunglasses", "eyewear" },
    };

    private readonly StorefrontProductsService _storefront;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CatalogSearchService> _logger;

    public CatalogSearchService(StorefrontProductsService storefront, IMemoryCache cache, ILogger<CatalogSearchService> logger)
    {
        _storefront = storefront;
        _cache      = cache;
        _logger     = logger;
    }

    private sealed record Doc(
        StorefrontProductsService.SearchableProduct Product,
        HashSet<string> NameWords,
        HashSet<string> CategoryWords,
        HashSet<string> DescriptionWords);

    public async Task<SearchResponse> SearchAsync(SearchRequest request, string? categoryName = null, bool sortDesc = false)
    {
        var sw = Stopwatch.StartNew();
        var docs = await GetCorpusAsync();
        var terms = Tokenize(request.Query).Distinct().ToList();

        // Short words ("car") prefix-match noise ("cardigan", "carpet"); when such a word already has
        // exact or synonym matches in the catalogue, only count those.
        var prefixAllowed = terms.ToDictionary(t => t, t =>
            t.Length > 3 || !docs.Any(d => StrongScore(t, d.NameWords) > 0 || StrongScore(t, d.CategoryWords) > 0 || StrongScore(t, d.DescriptionWords) > 0));

        var hits = Match(docs, terms, prefixAllowed, request, categoryName, requireAll: true);

        // Nothing contains every word ("red dress") — show products matching most of them instead of an empty page
        if (hits.Count == 0 && terms.Count > 1)
            hits = Match(docs, terms, prefixAllowed, request, categoryName, requireAll: false);

        IEnumerable<(Doc Doc, double Score)> ordered = request.SortBy switch
        {
            "price_asc"  => hits.OrderBy(h => EffectivePrice(h.Doc.Product)),
            "price_desc" => hits.OrderByDescending(h => EffectivePrice(h.Doc.Product)),
            "price"      => sortDesc ? hits.OrderByDescending(h => EffectivePrice(h.Doc.Product)) : hits.OrderBy(h => EffectivePrice(h.Doc.Product)),
            "name"       => sortDesc ? hits.OrderByDescending(h => h.Doc.Product.Name) : hits.OrderBy(h => h.Doc.Product.Name),
            "newest" or "createdAt" => hits.OrderByDescending(h => h.Doc.Product.Id),
            _            => hits.OrderByDescending(h => h.Score).ThenByDescending(h => h.Doc.Product.Id),
        };

        var page = ordered.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToList();
        sw.Stop();

        return new SearchResponse
        {
            Results = page.Select(h => new SearchResult
            {
                Id          = $"{h.Doc.Product.VendorId ?? "default"}_{h.Doc.Product.Id}",
                ProductId   = h.Doc.Product.Id.ToString(),
                Type        = "Product",
                Title       = h.Doc.Product.Name,
                Description = h.Doc.Product.Description ?? "",
                Category    = h.Doc.Product.CategoryName,
                Price       = EffectivePrice(h.Doc.Product),
                ImageUrl    = (h.Doc.Product.PrimaryImageUrl ?? "").Replace("\\", "/"),
                Url         = $"/products/{h.Doc.Product.Id}",
                Score       = h.Score,
                VendorName  = h.Doc.Product.VendorName,
            }).ToList(),
            TotalCount  = hits.Count,
            Page        = request.Page,
            PageSize    = request.PageSize,
            TimeTakenMs = sw.ElapsedMilliseconds,
            Query       = request.Query,
        };
    }

    private static List<(Doc Doc, double Score)> Match(
        List<Doc> docs, List<string> terms, Dictionary<string, bool> prefixAllowed,
        SearchRequest request, string? categoryName, bool requireAll)
    {
        var hits = new List<(Doc Doc, double Score)>();
        if (terms.Count == 0) return hits;

        foreach (var doc in docs)
        {
            var p = doc.Product;
            if (!string.IsNullOrWhiteSpace(categoryName) && !string.Equals(p.CategoryName, categoryName, StringComparison.OrdinalIgnoreCase)) continue;
            if (request.MinPrice.HasValue && EffectivePrice(p) < request.MinPrice.Value) continue;
            if (request.MaxPrice.HasValue && EffectivePrice(p) > request.MaxPrice.Value) continue;
            if (request.OnlyInStock && p.StockQuantity <= 0) continue;
            if (!string.IsNullOrEmpty(request.VendorId) && p.VendorId != request.VendorId) continue;

            // Score = sum of each word's best match (name weighs most, then category, then description)
            double total = 0;
            var matched = 0;
            for (var i = 0; i < terms.Count; i++)
            {
                var term = terms[i];
                var fuzzy = prefixAllowed[term];
                var best = Math.Max(
                    MatchScore(term, doc.NameWords, fuzzy) * 3.0,
                    Math.Max(MatchScore(term, doc.CategoryWords, fuzzy) * 2.0, MatchScore(term, doc.DescriptionWords, fuzzy, allowTypos: false)));
                // The last word is usually the product type ("red DRESS"), so it counts a little more
                if (i == terms.Count - 1 && terms.Count > 1) best *= 1.25;
                if (best > 0) { matched++; total += best; }
                else if (requireAll) break;
            }
            if (requireAll ? matched == terms.Count : matched > 0)
                hits.Add((doc, total + matched * 10)); // products matching more words always rank first
        }
        return hits;
    }

    /// <summary>Drop the cached corpus so the next search sees product changes immediately.</summary>
    public void Invalidate() => _cache.Remove(CacheKey);

    private async Task<List<Doc>> GetCorpusAsync()
    {
        if (_cache.TryGetValue(CacheKey, out List<Doc>? cached) && cached != null) return cached;

        var products = await _storefront.GetSearchableProductsAsync();
        var docs = products.Select(p => new Doc(
            p,
            Tokenize(p.Name).ToHashSet(),
            Tokenize(p.CategoryName).ToHashSet(),
            Tokenize(p.Description ?? "").ToHashSet())).ToList();

        _cache.Set(CacheKey, docs, CacheTtl);
        _logger.LogInformation("Catalog search corpus rebuilt: {Count} products", docs.Count);
        return docs;
    }

    private static decimal EffectivePrice(StorefrontProductsService.SearchableProduct p) =>
        p.DiscountPrice is > 0 && p.DiscountPrice < p.Price ? p.DiscountPrice.Value : p.Price;

    private static IEnumerable<string> Tokenize(string text) =>
        WordSplit.Split(text.ToLowerInvariant().Replace("'", ""))
            .Where(w => w.Length > 0);

    /// <summary>Exact (1.0, plural-insensitive) or synonym (0.7) match of one query word; 0 when neither.</summary>
    private static double StrongScore(string term, HashSet<string> words)
    {
        if (words.Count == 0) return 0;
        var stem = Singular(term);
        if (words.Contains(term) || words.Contains(stem) || words.Any(w => Singular(w) == stem)) return 1.0;
        if (Synonyms.TryGetValue(stem, out var syns) || Synonyms.TryGetValue(term, out syns))
            foreach (var syn in syns)
                if (words.Contains(syn) || words.Any(w => Singular(w) == Singular(syn)))
                    return 0.7;
        return 0;
    }

    /// <summary>Best match strength of one query word against a set of product words (0 = no match).</summary>
    /// Typo tolerance is off for descriptions — long prose is full of near-misses ("couch" / "touch").
    private static double MatchScore(string term, HashSet<string> words, bool fuzzy, bool allowTypos = true)
    {
        var strong = StrongScore(term, words);
        if (strong >= 1.0 || !fuzzy) return strong;

        double best = strong;
        foreach (var w in words)
        {
            if (term.Length >= 2 && w.StartsWith(term, StringComparison.Ordinal)) best = Math.Max(best, 0.8);
            else if (allowTypos && term.Length >= 5 && Math.Abs(w.Length - term.Length) <= 1 && WithinOneEdit(term, w)) best = Math.Max(best, 0.6);
        }
        return best;
    }

    private static string Singular(string w) =>
        w.Length > 3 && w.EndsWith("es") && (w.EndsWith("ches") || w.EndsWith("shes") || w.EndsWith("xes") || w.EndsWith("sses")) ? w[..^2]
        : w.Length > 3 && w.EndsWith('s') && !w.EndsWith("ss") ? w[..^1]
        : w;

    private static bool WithinOneEdit(string a, string b)
    {
        if (a == b) return true;
        int i = 0, j = 0, edits = 0;
        while (i < a.Length && j < b.Length)
        {
            if (a[i] == b[j]) { i++; j++; continue; }
            if (++edits > 1) return false;
            if (a.Length > b.Length) i++;
            else if (a.Length < b.Length) j++;
            else { i++; j++; }
        }
        return edits + (a.Length - i) + (b.Length - j) <= 1;
    }
}
