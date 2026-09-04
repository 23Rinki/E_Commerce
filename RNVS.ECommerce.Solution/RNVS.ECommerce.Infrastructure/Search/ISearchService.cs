using RNVS.ECommerce.Infrastructure.Search.Models;

namespace RNVS.ECommerce.Infrastructure.Search;

public interface ISearchService
{
    Task<SearchResponse> SearchAsync(SearchRequest request);
    Task<bool> IndexDocumentAsync(SearchIndex document);
    Task<bool> IndexDocumentsAsync(List<SearchIndex> documents);
    Task<bool> UpdateDocumentAsync(SearchIndex document);
    Task<bool> DeleteDocumentAsync(string id, string? vendorId = null);
    Task<bool> DeleteDocumentsByTypeAsync(string type);
    Task<List<string>> GetSuggestionsAsync(string query, int count = 10);
}