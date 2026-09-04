namespace RNVS.ECommerce.Application.Common;

public class FilterParameters
{
    public string? SearchTerm { get; set; }
    public Dictionary<string, string> Filters { get; set; } = new();
}