using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.ML;

public interface IRecommendationEngine
{
    Task<List<int>> GetRecommendedProductIdsAsync(string userId, int count = 10);
    Task<List<int>> GetSimilarProductsAsync(int productId, int count = 5);
    Task TrainModelAsync();
    Task UpdateUserBehaviorAsync(string userId, int productId, string action);
}

public class UserBehaviorData
{
    public string UserId { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string Action { get; set; } = string.Empty; // View, AddToCart, Purchase
    public DateTime Timestamp { get; set; }
}

public class ProductRecommendation
{
    public int ProductId { get; set; }
    public float Score { get; set; }
    public string Reason { get; set; } = string.Empty;
}