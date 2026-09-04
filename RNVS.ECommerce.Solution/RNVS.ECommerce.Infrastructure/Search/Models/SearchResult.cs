namespace RNVS.ECommerce.Infrastructure.Search.Models;

public class SearchResult
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public double Score { get; set; }
    public double Rating { get; set; }
    public string VendorName { get; set; } = string.Empty;
    public List<string> Highlights { get; set; } = new();
}

public class SearchResponse
{
    public List<SearchResult> Results { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public long TimeTakenMs { get; set; }
    public List<SearchFacet> Facets { get; set; } = new();
    public string Query { get; set; } = string.Empty;
}

public class SearchFacet
{
    public string Name { get; set; } = string.Empty;
    public List<FacetValue> Values { get; set; } = new();
}

public class FacetValue
{
    public string Value { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class SearchRequest
{
    public string Query { get; set; } = string.Empty;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public List<string> Categories { get; set; } = new();
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public double? MinRating { get; set; }
    public string VendorId { get; set; } = string.Empty;
    public string SortBy { get; set; } = "relevance"; // relevance, price_asc, price_desc, rating, newest
    public bool OnlyInStock { get; set; } = true;
}