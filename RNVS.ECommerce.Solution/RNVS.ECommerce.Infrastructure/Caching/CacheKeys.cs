namespace RNVS.ECommerce.Infrastructure.Caching;

public static class CacheKeys
{
    // Cache key prefixes
    private const string ProductPrefix = "product";
    private const string CategoryPrefix = "category";
    private const string UserPrefix = "user";
    private const string CartPrefix = "cart";
    private const string OrderPrefix = "order";
    private const string VendorPrefix = "vendor";
    private const string InventoryPrefix = "inventory";
    private const string ReviewPrefix = "review";
    private const string SearchPrefix = "search";
    private const string RecommendationPrefix = "recommendation";

    // Product cache keys
    public static string Product(Guid productId) => $"{ProductPrefix}:{productId}";
    public static string ProductBySlug(string slug) => $"{ProductPrefix}:slug:{slug}";
    public static string ProductsByCategory(Guid categoryId, int page = 1, int pageSize = 20)
        => $"{ProductPrefix}:category:{categoryId}:page:{page}:size:{pageSize}";
    public static string ProductsByVendor(Guid vendorId, int page = 1, int pageSize = 20)
        => $"{ProductPrefix}:vendor:{vendorId}:page:{page}:size:{pageSize}";
    public static string FeaturedProducts(int count = 10) => $"{ProductPrefix}:featured:{count}";
    public static string BestSellingProducts(int count = 10) => $"{ProductPrefix}:bestselling:{count}";
    public static string NewArrivals(int count = 10) => $"{ProductPrefix}:newarrivals:{count}";
    public static string ProductPattern => $"{ProductPrefix}:*";

    // Category cache keys
    public static string Category(Guid categoryId) => $"{CategoryPrefix}:{categoryId}";
    public static string CategoryBySlug(string slug) => $"{CategoryPrefix}:slug:{slug}";
    public static string AllCategories => $"{CategoryPrefix}:all";
    public static string CategoryTree => $"{CategoryPrefix}:tree";
    public static string CategoryChildren(Guid parentId) => $"{CategoryPrefix}:children:{parentId}";
    public static string CategoryPattern => $"{CategoryPrefix}:*";

    // User cache keys
    public static string User(Guid userId) => $"{UserPrefix}:{userId}";
    public static string UserByEmail(string email) => $"{UserPrefix}:email:{email}";
    public static string UserProfile(Guid userId) => $"{UserPrefix}:profile:{userId}";
    public static string UserPermissions(Guid userId) => $"{UserPrefix}:permissions:{userId}";
    public static string UserPattern => $"{UserPrefix}:*";

    // Cart cache keys
    public static string Cart(Guid userId) => $"{CartPrefix}:{userId}";
    public static string CartCount(Guid userId) => $"{CartPrefix}:count:{userId}";
    public static string CartTotal(Guid userId) => $"{CartPrefix}:total:{userId}";
    public static string CartPattern => $"{CartPrefix}:*";

    // Order cache keys
    public static string Order(Guid orderId) => $"{OrderPrefix}:{orderId}";
    public static string UserOrders(Guid userId, int page = 1, int pageSize = 20)
        => $"{OrderPrefix}:user:{userId}:page:{page}:size:{pageSize}";
    public static string VendorOrders(Guid vendorId, int page = 1, int pageSize = 20)
        => $"{OrderPrefix}:vendor:{vendorId}:page:{page}:size:{pageSize}";
    public static string OrderPattern => $"{OrderPrefix}:*";

    // Vendor cache keys
    public static string Vendor(Guid vendorId) => $"{VendorPrefix}:{vendorId}";
    public static string VendorProfile(Guid vendorId) => $"{VendorPrefix}:profile:{vendorId}";
    public static string VendorBranding(Guid vendorId) => $"{VendorPrefix}:branding:{vendorId}";
    public static string VendorStats(Guid vendorId) => $"{VendorPrefix}:stats:{vendorId}";
    public static string AllVendors(int page = 1, int pageSize = 20)
        => $"{VendorPrefix}:all:page:{page}:size:{pageSize}";
    public static string VendorPattern => $"{VendorPrefix}:*";

    // Inventory cache keys
    public static string ProductStock(Guid productId) => $"{InventoryPrefix}:stock:{productId}";
    public static string LowStockProducts(Guid vendorId) => $"{InventoryPrefix}:lowstock:{vendorId}";
    public static string InventoryPattern => $"{InventoryPrefix}:*";

    // Review cache keys
    public static string ProductReviews(Guid productId, int page = 1, int pageSize = 10)
        => $"{ReviewPrefix}:product:{productId}:page:{page}:size:{pageSize}";
    public static string ProductRating(Guid productId) => $"{ReviewPrefix}:rating:{productId}";
    public static string ReviewPattern => $"{ReviewPrefix}:*";

    // Search cache keys
    public static string SearchResults(string query, int page = 1, int pageSize = 20)
        => $"{SearchPrefix}:query:{query.ToLowerInvariant()}:page:{page}:size:{pageSize}";
    public static string PopularSearches(int count = 10) => $"{SearchPrefix}:popular:{count}";
    public static string SearchPattern => $"{SearchPrefix}:*";

    // Recommendation cache keys
    public static string UserRecommendations(Guid userId, int count = 10)
        => $"{RecommendationPrefix}:user:{userId}:count:{count}";
    public static string ProductRecommendations(Guid productId, int count = 10)
        => $"{RecommendationPrefix}:product:{productId}:count:{count}";
    public static string RecommendationPattern => $"{RecommendationPrefix}:*";

    // Settings cache keys
    public static string SystemSettings => "settings:system";
    public static string EmailTemplates => "settings:emailtemplates";
    public static string ShippingRates => "settings:shippingrates";

    // Helper methods
    public static string[] GetPatterns() => new[]
    {
        ProductPattern,
        CategoryPattern,
        UserPattern,
        CartPattern,
        OrderPattern,
        VendorPattern,
        InventoryPattern,
        ReviewPattern,
        SearchPattern,
        RecommendationPattern
    };
}