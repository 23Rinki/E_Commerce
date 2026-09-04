using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Application.Interfaces.Repositories;

namespace RNVS.ECommerce.Infrastructure.ML;

public class ProductRecommendationService : IRecommendationEngine
{
    private readonly ILogger<ProductRecommendationService> _logger;
    private readonly IProductRepository _productRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IUserBehaviorRepository _userBehaviorRepository;

    public ProductRecommendationService(
        ILogger<ProductRecommendationService> logger,
        IProductRepository productRepository,
        IOrderRepository orderRepository,
        IUserBehaviorRepository userBehaviorRepository)
    {
        _logger = logger;
        _productRepository = productRepository;
        _orderRepository = orderRepository;
        _userBehaviorRepository = userBehaviorRepository;
    }

    public async Task<List<int>> GetRecommendedProductIdsAsync(string userId, int count = 10)
    {
        try
        {
            _logger.LogInformation("Getting recommendations for user {UserId}", userId);

            // Get user's behavior history
            var userBehavior = await GetUserBehaviorAsync(userId);

            if (!userBehavior.Any())
            {
                // New user - return popular products
                return await GetPopularProductsAsync(count);
            }

            // Collaborative filtering based on similar users
            var recommendations = await CollaborativeFilteringAsync(userId, userBehavior, count);

            // Content-based filtering based on user's past interactions
            var contentBased = await ContentBasedFilteringAsync(userId, userBehavior, count);

            // Combine both approaches
            var combined = recommendations
                .Union(contentBased)
                .Take(count)
                .ToList();

            _logger.LogInformation("Generated {Count} recommendations for user {UserId}", combined.Count, userId);

            return combined;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating recommendations for user {UserId}", userId);
            return await GetPopularProductsAsync(count);
        }
    }

    public async Task<List<int>> GetSimilarProductsAsync(int productId, int count = 5)
    {
        try
        {
            _logger.LogInformation("Getting similar products for product {ProductId}", productId);

            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null)
            {
                return new List<int>();
            }

            // Get products from same category
            var similarProducts = await _productRepository.GetByCategoryAsync(product.CategoryId);

            // Calculate similarity score based on price range and category
            var recommendations = similarProducts
                .Where(p => p.Id != productId && p.IsActive)
                .OrderBy(p => Math.Abs(p.Price - product.Price))
                .Take(count)
                .Select(p => p.Id)
                .ToList();

            return recommendations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar products for {ProductId}", productId);
            return new List<int>();
        }
    }

    public async Task TrainModelAsync()
    {
        try
        {
            _logger.LogInformation("Training recommendation model");

            // In production, this would train an ML.NET model
            // For now, we'll use rule-based recommendations

            // Collect training data from orders and user behavior
            // Build user-item interaction matrix
            // Train collaborative filtering model

            _logger.LogInformation("Model training completed");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error training recommendation model");
        }
    }

    public async Task UpdateUserBehaviorAsync(string userId, int productId, string action)
    {
        try
        {
            var eventType = action.ToLower() switch
            {
                "view" => Domain.Enums.UserEventType.ProductView,
                "addtocart" => Domain.Enums.UserEventType.AddToCart,
                "purchase" => Domain.Enums.UserEventType.OrderPlaced,
                _ => Domain.Enums.UserEventType.ProductView
            };

            var behavior = new Domain.Entities.Analytics.UserBehavior
            {
                UserId = userId,
                SessionId = Guid.NewGuid().ToString(),
                EventType = eventType,
                ProductId = productId,
                CreatedAt = DateTime.UtcNow
            };

            await _userBehaviorRepository.AddAsync(behavior);

            _logger.LogInformation("Updated behavior for user {UserId}: {Action} on product {ProductId}",
                userId, action, productId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user behavior");
        }
    }

    private async Task<List<UserBehaviorData>> GetUserBehaviorAsync(string userId)
    {
        try
        {
            // Get user behavior from database
            var userBehaviors = await _userBehaviorRepository.GetByUserIdAsync(userId, 100);

            // Convert to UserBehaviorData for compatibility
            var behaviorData = userBehaviors.Select(ub => new UserBehaviorData
            {
                UserId = ub.UserId ?? string.Empty,
                ProductId = ub.ProductId ?? 0,
                Action = ub.EventType switch
                {
                    Domain.Enums.UserEventType.ProductView => "View",
                    Domain.Enums.UserEventType.AddToCart => "AddToCart",
                    Domain.Enums.UserEventType.OrderPlaced => "Purchase",
                    _ => "View"
                },
                Timestamp = ub.CreatedAt
            }).ToList();

            return behaviorData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user behavior from database");
            return new List<UserBehaviorData>();
        }
    }

    private async Task<List<int>> GetPopularProductsAsync(int count)
    {
        try
        {
            // Get most popular products based on sales
            var allProducts = await _productRepository.GetAllAsync();

            return allProducts
                .Where(p => p.IsActive)
                .OrderByDescending(p => p.StockQuantity) // In production, order by sales count
                .Take(count)
                .Select(p => p.Id)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular products");
            return new List<int>();
        }
    }

    private async Task<List<int>> CollaborativeFilteringAsync(string userId, List<UserBehaviorData> userBehavior, int count)
    {
        // Simplified collaborative filtering
        // In production, this would use ML.NET or a trained model

        var purchasedProducts = userBehavior
            .Where(b => b.Action == "Purchase")
            .Select(b => b.ProductId)
            .ToList();

        if (!purchasedProducts.Any())
        {
            return new List<int>();
        }

        // Find products frequently bought together
        var recommendations = new List<int>();

        foreach (var productId in purchasedProducts.Take(3))
        {
            var similar = await GetSimilarProductsAsync(productId, 3);
            recommendations.AddRange(similar);
        }

        return recommendations
            .Distinct()
            .Where(id => !purchasedProducts.Contains(id))
            .Take(count)
            .ToList();
    }

    private async Task<List<int>> ContentBasedFilteringAsync(string userId, List<UserBehaviorData> userBehavior, int count)
    {
        // Content-based filtering based on product attributes
        var viewedProducts = userBehavior
            .Where(b => b.Action == "View")
            .Select(b => b.ProductId)
            .Distinct()
            .ToList();

        if (!viewedProducts.Any())
        {
            return new List<int>();
        }

        // Get products from same categories as viewed products
        var recommendations = new List<int>();

        foreach (var productId in viewedProducts.Take(5))
        {
            var product = await _productRepository.GetByIdAsync(productId);
            if (product != null)
            {
                var categoryProducts = await _productRepository.GetByCategoryAsync(product.CategoryId);
                recommendations.AddRange(categoryProducts
                    .Where(p => p.Id != productId && p.IsActive)
                    .Take(2)
                    .Select(p => p.Id));
            }
        }

        return recommendations
            .Distinct()
            .Take(count)
            .ToList();
    }
}