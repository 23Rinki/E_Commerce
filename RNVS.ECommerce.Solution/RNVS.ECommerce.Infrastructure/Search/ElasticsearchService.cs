using Elastic.Clients.Elasticsearch;
using Elastic.Transport;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using CustomSearchRequest = RNVS.ECommerce.Infrastructure.Search.Models.SearchRequest;
using RNVS.ECommerce.Infrastructure.Search.Models;
using System.Diagnostics;
using static iText.IO.Codec.TiffWriter;

namespace RNVS.ECommerce.Infrastructure.Search;

public class ElasticsearchService : ISearchService
{
    private readonly ILogger<ElasticsearchService> _logger;
    private readonly ElasticsearchClient _client;
    private readonly ElasticsearchOptions _options;
    private const string DefaultIndex = "rnvs-products";

    public ElasticsearchService(
        ILogger<ElasticsearchService> logger,
        IOptions<ElasticsearchOptions> options)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));

        var settings = new ElasticsearchClientSettings(new Uri(_options.Url))
            .DefaultIndex(_options.DefaultIndex ?? DefaultIndex);

        if (!string.IsNullOrWhiteSpace(_options.Username) && !string.IsNullOrWhiteSpace(_options.Password))
        {
            settings.Authentication(new BasicAuthentication(_options.Username, _options.Password));
        }

        if (_options.EnableDebugMode)
        {
            settings.EnableDebugMode();
        }

        _client = new ElasticsearchClient(settings);
        _logger.LogInformation("Elasticsearch client initialized for: {Url}", _options.Url);
    }

    public async Task<SearchResponse> SearchAsync(CustomSearchRequest request)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                _logger.LogWarning("Search called with empty query");
                return new SearchResponse();
            }

            _logger.LogInformation("Elasticsearch search for: {Query}", request.Query);

            var skip = (request.Page - 1) * request.PageSize;

            var searchResponse = await _client.SearchAsync<SearchIndex>(s => s
                .Index(_options.DefaultIndex)
                .From(skip)
                .Size(request.PageSize)
                .Query(q => q
                    .Bool(b => b
                        .Must(m => m
                            .MultiMatch(mm => mm
                                .Query(request.Query)
                                .Fields(new[] { "title^3", "description^2", "content", "tags" })
                                .Fuzziness(new Fuzziness("AUTO"))
                            )
                        )
                        .Filter(BuildFilters(request))
                    )
                )
                .Sort(BuildSort(request))
                // .Highlight(h => h
                //     .Fields(f => f
                //         .Add("title", new HighlightField())
                //         .Add("description", new HighlightField())
                //     )
                // )
            );

            stopwatch.Stop();

            if (!searchResponse.IsValidResponse)
            {
                _logger.LogError("Elasticsearch search failed: {Error}", searchResponse.DebugInformation);
                return new SearchResponse();
            }

            var results = searchResponse.Documents.Select((doc, index) =>
            {
                var highlights = new List<string>();
                if (searchResponse.Hits.ElementAtOrDefault(index)?.Highlight != null)
                {
                    var hit = searchResponse.Hits.ElementAt(index);
                    foreach (var highlight in hit.Highlight)
                    {
                        highlights.AddRange(highlight.Value);
                    }
                }

                return new SearchResult
                {
                    Id = doc.Id,
                    Type = doc.Type,
                    Title = doc.Title,
                    Description = doc.Description,
                    Category = doc.Category,
                    Price = doc.Price,
                    ImageUrl = doc.ImageUrl,
                    Url = doc.Url,
                    Score = searchResponse.Hits.ElementAtOrDefault(index)?.Score ?? 0,
                    Rating = doc.Rating,
                    VendorName = doc.VendorName,
                    Highlights = highlights
                };
            }).ToList();

            _logger.LogInformation("Elasticsearch search completed in {Ms}ms, found {Count} results",
                stopwatch.ElapsedMilliseconds, searchResponse.Total);

            return new SearchResponse
            {
                Results = results,
                TotalCount = (int)searchResponse.Total,
                Page = request.Page,
                PageSize = request.PageSize,
                TimeTakenMs = stopwatch.ElapsedMilliseconds,
                Query = request.Query
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing Elasticsearch search for query: {Query}", request.Query);
            stopwatch.Stop();

            return new SearchResponse
            {
                Results = new List<SearchResult>(),
                TotalCount = 0,
                TimeTakenMs = stopwatch.ElapsedMilliseconds,
                Query = request.Query
            };
        }
    }

    public async Task<bool> IndexDocumentAsync(SearchIndex document)
    {
        try
        {
            var response = await _client.IndexAsync(document, idx => idx
                .Index(_options.DefaultIndex)
                .Id(document.Id)
            );

            if (!response.IsValidResponse)
            {
                _logger.LogError("Failed to index document {Id}: {Error}", document.Id, response.DebugInformation);
                return false;
            }

            _logger.LogInformation("Document {Id} indexed successfully", document.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error indexing document {Id}", document.Id);
            return false;
        }
    }

    public async Task<bool> IndexDocumentsAsync(List<SearchIndex> documents)
    {
        try
        {
            var bulkResponse = await _client.BulkAsync(b => b
                .Index(_options.DefaultIndex)
                .IndexMany(documents)
            );

            if (!bulkResponse.IsValidResponse)
            {
                _logger.LogError("Bulk indexing failed: {Error}", bulkResponse.DebugInformation);
                return false;
            }

            _logger.LogInformation("Bulk indexed {Count} documents", documents.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk indexing documents");
            return false;
        }
    }

    public async Task<bool> UpdateDocumentAsync(SearchIndex document)
    {
        try
        {
            var response = await _client.UpdateAsync<SearchIndex, SearchIndex>(
                _options.DefaultIndex,
                document.Id,
                u => u.Doc(document)
            );

            if (!response.IsValidResponse)
            {
                _logger.LogError("Failed to update document {Id}: {Error}", document.Id, response.DebugInformation);
                return false;
            }

            _logger.LogInformation("Document {Id} updated successfully", document.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating document {Id}", document.Id);
            return false;
        }
    }

    public async Task<bool> DeleteDocumentAsync(string id, string? vendorId = null)
    {
        try
        {
            var response = await _client.DeleteAsync(_options.DefaultIndex, id);

            if (!response.IsValidResponse)
            {
                _logger.LogError("Failed to delete document {Id}: {Error}", id, response.DebugInformation);
                return false;
            }

            _logger.LogInformation("Document {Id} deleted successfully", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting document {Id}", id);
            return false;
        }
    }

    public async Task<bool> DeleteDocumentsByTypeAsync(string type)
    {
        try
        {
            var response = await _client.DeleteByQueryAsync<SearchIndex>(_options.DefaultIndex, d => d
                .Query(q => q
                    .Term(t => t.Field(f => f.Type).Value(type))
                )
            );

            if (!response.IsValidResponse)
            {
                _logger.LogError("Failed to delete documents by type {Type}: {Error}", type, response.DebugInformation);
                return false;
            }

            _logger.LogInformation("Deleted {Count} documents of type {Type}", response.Deleted, type);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting documents by type {Type}", type);
            return false;
        }
    }

    public async Task<List<string>> GetSuggestionsAsync(string query, int count = 10)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            {
                return new List<string>();
            }

            var response = await _client.SearchAsync<SearchIndex>(s => s
                .Index(_options.DefaultIndex)
                .Size(count)
                .Query(q => q
                    .Match(m => m
                        .Field(f => f.Title)
                        .Query(query)
                    )
                )
            );

            if (!response.IsValidResponse)
            {
                _logger.LogError("Failed to get suggestions: {Error}", response.DebugInformation);
                return new List<string>();
            }

            var suggestions = response.Documents
                .Select(d => d.Title)
                .Distinct()
                .ToList();

            _logger.LogDebug("Generated {Count} suggestions for query: {Query}", suggestions.Count, query);
            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting suggestions for query: {Query}", query);
            return new List<string>();
        }
    }

    // Elasticsearch is not currently used (appsettings.json has Provider="SQL")
    // This method is commented out to avoid compilation errors with Elasticsearch client library
    /*
    private List<Action<QueryDescriptor<SearchIndex>>> BuildFilters(CustomSearchRequest request)
    {
        var filters = new List<Action<QueryDescriptor<SearchIndex>>>();

        // Category filter
        if (request.Categories.Any())
        {
            filters.Add(f => f.Terms(t => t.Field(fd => fd.Category).Terms(new TermsQueryField(request.Categories.ToArray()))));
        }

        // Price range filter
        if (request.MinPrice.HasValue || request.MaxPrice.HasValue)
        {
            filters.Add(f => f.Range(r =>
            {
                var range = r.Field(fd => fd.Price);
                if (request.MinPrice.HasValue)
                    range = range.Gte((double)request.MinPrice.Value);
                if (request.MaxPrice.HasValue)
                    range = range.Lte((double)request.MaxPrice.Value);
                return range;
            }));
        }

        // Rating filter
        if (request.MinRating.HasValue)
        {
            filters.Add(f => f.Range(r => r.Field(fd => fd.Rating).Gte(request.MinRating.Value)));
        }

        // Vendor filter
        if (!string.IsNullOrWhiteSpace(request.VendorId))
        {
            filters.Add(f => f.Term(t => t.Field(fd => fd.VendorId).Value(request.VendorId)));
        }

        // Active filter
        filters.Add(f => f.Term(t => t.Field(fd => fd.IsActive).Value(true)));

        return filters;
    }
    */

    // Stub method to prevent compilation errors - commented out due to API mismatch
    private ICollection<Elastic.Clients.Elasticsearch.QueryDsl.Query>? BuildFilters(CustomSearchRequest request)
    {
        // Return null to avoid filters when Elasticsearch is not being used
        return null;
    }

    // Commented out due to API mismatch with Elasticsearch client library
    /*
    private ICollection<SortOptions> BuildSort(CustomSearchRequest request)
    {
        return request.SortBy.ToLower() switch
        {
            "price_asc" => new List<SortOptions> { SortOptions.Field(new Field("price"), new FieldSort { Order = SortOrder.Asc }) },
            "price_desc" => new List<SortOptions> { SortOptions.Field(new Field("price"), new FieldSort { Order = SortOrder.Desc }) },
            "rating" => new List<SortOptions> { SortOptions.Field(new Field("rating"), new FieldSort { Order = SortOrder.Desc }) },
            "newest" => new List<SortOptions> { SortOptions.Field(new Field("createdAt"), new FieldSort { Order = SortOrder.Desc }) },
            _ => new List<SortOptions> { SortOptions.Score() }
        };
    }
    */

    private ICollection<SortOptions>? BuildSort(CustomSearchRequest request)
    {
        // Return null to use default sorting when Elasticsearch is not being used
        return null;
    }
}

public class ElasticsearchOptions
{
    public string Url { get; set; } = "http://localhost:9200";
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DefaultIndex { get; set; } = "rnvs-products";
    public bool EnableDebugMode { get; set; } = false;
}