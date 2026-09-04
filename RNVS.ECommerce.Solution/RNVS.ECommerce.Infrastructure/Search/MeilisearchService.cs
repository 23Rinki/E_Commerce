using Meilisearch;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Infrastructure.Search.Models;
using System.Diagnostics;

namespace RNVS.ECommerce.Infrastructure.Search;

public class MeilisearchService : ISearchService
{
    private readonly MeilisearchClient _client;
    private readonly ILogger<MeilisearchService> _logger;
    private const string AllIndex = "products_all";

    private static readonly SemaphoreSlim _configLock = new(1, 1);
    private static readonly HashSet<string> _configuredIndexes = new();

    public MeilisearchService(IConfiguration configuration, ILogger<MeilisearchService> logger)
    {
        var url    = configuration["Search:Meilisearch:Url"]    ?? "http://localhost:7700";
        var apiKey = configuration["Search:Meilisearch:ApiKey"] ?? "";
        _client = new MeilisearchClient(url, apiKey);
        _logger = logger;
    }

    private static string VendorIndex(string vendorId) =>
        $"products_{vendorId.Replace("-", "_").Replace(" ", "_").ToLower()}";

    private async Task EnsureIndexConfiguredAsync(string indexName)
    {
        if (_configuredIndexes.Contains(indexName)) return;
        await _configLock.WaitAsync();
        try
        {
            if (_configuredIndexes.Contains(indexName)) return;
            var idx = _client.Index(indexName);
            await idx.UpdateFilterableAttributesAsync(
                new[] { "isActive", "stockQuantity", "price", "category", "categoryId", "vendorId" });
            await idx.UpdateSortableAttributesAsync(
                new[] { "price", "createdAt", "viewCount", "rating" });
            await idx.UpdateSearchableAttributesAsync(
                new[] { "title", "description", "category", "tags", "vendorName", "content" });
            _configuredIndexes.Add(indexName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not configure Meilisearch index {Index}", indexName);
        }
        finally
        {
            _configLock.Release();
        }
    }

    public async Task<SearchResponse> SearchAsync(SearchRequest request)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var indexName = string.IsNullOrEmpty(request.VendorId)
                ? AllIndex
                : VendorIndex(request.VendorId);

            await EnsureIndexConfiguredAsync(indexName);

            var filters = new List<string> { "isActive = true" };
            if (request.OnlyInStock)         filters.Add("stockQuantity > 0");
            if (request.MinPrice.HasValue)    filters.Add($"price >= {request.MinPrice}");
            if (request.MaxPrice.HasValue)    filters.Add($"price <= {request.MaxPrice}");
            if (request.Categories.Count > 0)
            {
                var catFilter = string.Join(" OR ", request.Categories.Select(c => $"category = \"{c}\""));
                filters.Add($"({catFilter})");
            }

            var sort = request.SortBy switch
            {
                "price_asc"  => new[] { "price:asc" },
                "price_desc" => new[] { "price:desc" },
                "newest"     => new[] { "createdAt:desc" },
                "popular"    => new[] { "viewCount:desc" },
                _            => null
            };

            var searchQuery = new SearchQuery
            {
                Filter      = string.Join(" AND ", filters),
                Sort        = sort,
                HitsPerPage = request.PageSize,
                Page        = request.Page,
            };

            var rawResult = await _client.Index(indexName)
                .SearchAsync<SearchIndex>(request.Query, searchQuery);
            sw.Stop();

            var typedResult = rawResult as Meilisearch.SearchResult<SearchIndex>;
            var totalCount  = (int)(typedResult?.EstimatedTotalHits ?? rawResult.Hits.Count);

            return new SearchResponse
            {
                Results = rawResult.Hits.Select(h => new SearchResult
                {
                    Id          = h.Id,
                    ProductId   = h.ProductId,
                    Type        = h.Type,
                    Title       = h.Title,
                    Description = h.Description,
                    Category    = h.Category,
                    Price       = h.Price,
                    ImageUrl    = h.ImageUrl,
                    Url         = h.Url,
                    Score       = 1.0,
                    Rating      = h.Rating,
                    VendorName  = h.VendorName,
                }).ToList(),
                TotalCount  = totalCount,
                Page        = request.Page,
                PageSize    = request.PageSize,
                TimeTakenMs = sw.ElapsedMilliseconds,
                Query       = request.Query,
            };
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Meilisearch search failed for query '{Query}'", request.Query);
            return new SearchResponse { Query = request.Query, TimeTakenMs = sw.ElapsedMilliseconds };
        }
    }

    public async Task<bool> IndexDocumentAsync(SearchIndex document)
    {
        try
        {
            var docs = new[] { document };
            await EnsureIndexConfiguredAsync(AllIndex);
            await _client.Index(AllIndex).AddDocumentsAsync(docs, "id");

            if (!string.IsNullOrEmpty(document.VendorId))
            {
                var vi = VendorIndex(document.VendorId);
                await EnsureIndexConfiguredAsync(vi);
                await _client.Index(vi).AddDocumentsAsync(docs, "id");
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to index document {Id}", document.Id);
            return false;
        }
    }

    public async Task<bool> IndexDocumentsAsync(List<SearchIndex> documents)
    {
        try
        {
            await EnsureIndexConfiguredAsync(AllIndex);
            await _client.Index(AllIndex).AddDocumentsAsync(documents, "id");

            foreach (var group in documents.GroupBy(d => d.VendorId).Where(g => !string.IsNullOrEmpty(g.Key)))
            {
                var vi = VendorIndex(group.Key);
                await EnsureIndexConfiguredAsync(vi);
                await _client.Index(vi).AddDocumentsAsync(group.ToList(), "id");
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bulk index {Count} documents", documents.Count);
            return false;
        }
    }

    public async Task<bool> UpdateDocumentAsync(SearchIndex document)
    {
        try
        {
            var docs = new[] { document };
            await _client.Index(AllIndex).UpdateDocumentsAsync(docs, "id");

            if (!string.IsNullOrEmpty(document.VendorId))
                await _client.Index(VendorIndex(document.VendorId)).UpdateDocumentsAsync(docs, "id");

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update document {Id}", document.Id);
            return false;
        }
    }

    public async Task<bool> DeleteDocumentAsync(string id, string? vendorId = null)
    {
        try
        {
            await _client.Index(AllIndex).DeleteOneDocumentAsync(id);

            if (!string.IsNullOrEmpty(vendorId))
                await _client.Index(VendorIndex(vendorId)).DeleteOneDocumentAsync(id);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete document {Id}", id);
            return false;
        }
    }

    public Task<bool> DeleteDocumentsByTypeAsync(string type) => Task.FromResult(true);

    public async Task<List<string>> GetSuggestionsAsync(string query, int count = 10)
    {
        try
        {
            var result = await _client.Index(AllIndex).SearchAsync<SearchIndex>(query, new SearchQuery
            {
                Limit                = count,
                AttributesToRetrieve = new[] { "title" },
            });
            return result.Hits.Select(h => h.Title).Distinct().ToList();
        }
        catch
        {
            return new List<string>();
        }
    }
}
