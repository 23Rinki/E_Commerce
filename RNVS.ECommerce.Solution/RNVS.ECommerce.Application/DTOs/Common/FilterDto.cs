namespace RNVS.ECommerce.Application.DTOs.Common;

public class FilterDto
{
    public string? FilterBy { get; set; }
    public string? FilterValue { get; set; }
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}