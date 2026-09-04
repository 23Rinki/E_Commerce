using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Application.Interfaces.Repositories;

namespace RNVS.ECommerce.Infrastructure.ML;

public class UserBehaviorAnalyzer
{
    private readonly ILogger<UserBehaviorAnalyzer> _logger;
    private readonly IOrderRepository _orderRepository;
    private readonly IProductRepository _productRepository;

    public UserBehaviorAnalyzer(
        ILogger<UserBehaviorAnalyzer> logger,
        IOrderRepository orderRepository,
        IProductRepository productRepository)
    {
        _logger = logger;
        _orderRepository = orderRepository;
        _productRepository = productRepository;
    }

    public async Task<UserProfileAnalysis> AnalyzeUserProfileAsync(string userId)
    {
        try
        {
            _logger.LogInformation("Analyzing user profile for {UserId}", userId);

            var orders = await _orderRepository.GetByUserIdAsync(userId);

            var analysis = new UserProfileAnalysis
            {
                UserId = userId,
                TotalOrders = orders.Count(),
                TotalSpent = orders.Sum(o => o.TotalAmount),
                AverageOrderValue = orders.Any() ? orders.Average(o => o.TotalAmount) : 0,
                LastOrderDate = orders.Any() ? orders.Max(o => o.CreatedAt) : null,
                PreferredCategories = await GetPreferredCategoriesAsync(orders),
                PriceRange = CalculatePriceRange(orders),
                PurchaseFrequency = CalculatePurchaseFrequency(orders)
            };

            _logger.LogInformation("User profile analysis completed for {UserId}", userId);
            return analysis;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing user profile for {UserId}", userId);
            return new UserProfileAnalysis { UserId = userId };
        }
    }

    public async Task<List<int>> GetTrendingProductsAsync(int count = 10)
    {
        try
        {
            _logger.LogInformation("Getting trending products");

            // In production, this would analyze recent sales data
            var allProducts = await _productRepository.GetAllAsync();

            // Simple trending based on active products
            // In production, calculate based on recent sales velocity
            return allProducts
                .Where(p => p.IsActive)
                .OrderByDescending(p => p.CreatedAt)
                .Take(count)
                .Select(p => p.Id)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending products");
            return new List<int>();
        }
    }

    public async Task<Dictionary<int, int>> GetFrequentlyBoughtTogetherAsync(int productId)
    {
        try
        {
            _logger.LogInformation("Getting frequently bought together products for {ProductId}", productId);

            // In production, analyze order history to find products frequently bought together
            // This is a simplified version
            var frequentPairs = new Dictionary<int, int>();

            return frequentPairs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting frequently bought together products");
            return new Dictionary<int, int>();
        }
    }

    private async Task<List<int>> GetPreferredCategoriesAsync(IEnumerable<RNVS.ECommerce.Domain.Entities.Order.Order> orders)
    {
        // Analyze orders to find preferred categories
        // This is simplified - in production, you'd track product categories per order
        return new List<int>();
    }

    private PriceRangePreference CalculatePriceRange(IEnumerable<RNVS.ECommerce.Domain.Entities.Order.Order> orders)
    {
        if (!orders.Any())
        {
            return new PriceRangePreference();
        }

        var amounts = orders.Select(o => o.TotalAmount).ToList();

        return new PriceRangePreference
        {
            MinPrice = amounts.Min(),
            MaxPrice = amounts.Max(),
            AveragePrice = amounts.Average()
        };
    }

    private string CalculatePurchaseFrequency(IEnumerable<RNVS.ECommerce.Domain.Entities.Order.Order> orders)
    {
        if (!orders.Any())
        {
            return "None";
        }

        var orderCount = orders.Count();
        var daysSinceFirst = (DateTime.UtcNow - orders.Min(o => o.CreatedAt)).TotalDays;

        if (daysSinceFirst == 0)
        {
            return "New";
        }

        var ordersPerMonth = (orderCount / daysSinceFirst) * 30;

        return ordersPerMonth switch
        {
            >= 4 => "Very High",
            >= 2 => "High",
            >= 1 => "Medium",
            >= 0.5 => "Low",
            _ => "Very Low"
        };
    }
}

public class UserProfileAnalysis
{
    public string UserId { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public decimal TotalSpent { get; set; }
    public decimal AverageOrderValue { get; set; }
    public DateTime? LastOrderDate { get; set; }
    public List<int> PreferredCategories { get; set; } = new();
    public PriceRangePreference PriceRange { get; set; } = new();
    public string PurchaseFrequency { get; set; } = "None";
}

public class PriceRangePreference
{
    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }
    public decimal AveragePrice { get; set; }
}