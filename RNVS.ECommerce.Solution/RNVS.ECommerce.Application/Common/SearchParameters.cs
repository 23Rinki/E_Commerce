namespace RNVS.ECommerce.Application.Common;

public class SearchParameters
{
    public string Query { get; set; } = string.Empty;
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
}