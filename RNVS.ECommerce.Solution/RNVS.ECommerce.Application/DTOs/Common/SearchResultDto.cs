namespace RNVS.ECommerce.Application.DTOs.Common;

public class SearchResultDto<T>
{
    public List<T> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public string SearchTerm { get; set; } = string.Empty;
}