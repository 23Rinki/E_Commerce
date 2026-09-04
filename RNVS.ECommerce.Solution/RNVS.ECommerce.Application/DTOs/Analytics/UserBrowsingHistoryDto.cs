namespace RNVS.ECommerce.Application.DTOs.Analytics;

public class UserBrowsingHistoryDto
{
    public List<ProductViewHistoryDto> RecentViews { get; set; } = new();
    public int TotalViews { get; set; }
    public List<int> ViewedProductIds { get; set; } = new();
}
