using Microsoft.Extensions.Logging;

namespace RNVS.ECommerce.Infrastructure.Caching;

public interface ICacheService
{
    // Basic Get/Set operations
    Task<T?> GetAsync<T>(string key);
    Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiration = null);
    Task<bool> RemoveAsync(string key);
    Task<bool> ExistsAsync(string key);

    // Batch operations
    Task<Dictionary<string, T?>> GetManyAsync<T>(IEnumerable<string> keys);
    Task<bool> SetManyAsync<T>(Dictionary<string, T> items, TimeSpan? expiration = null);
    Task<bool> RemoveManyAsync(IEnumerable<string> keys);

    // Get or Set pattern (cache-aside)
    Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null);

    // Cache invalidation
    Task<bool> RemoveByPatternAsync(string pattern);
    Task<bool> ClearAllAsync();

    // Cache statistics
    Task<long> GetCacheSizeAsync();
    Task<IEnumerable<string>> GetAllKeysAsync();
}

public class CacheOptions
{
    public TimeSpan DefaultExpiration { get; set; } = TimeSpan.FromMinutes(30);
    public TimeSpan SlidingExpiration { get; set; } = TimeSpan.FromMinutes(10);
    public bool UseDistributedCache { get; set; } = false;
    public string? RedisConnectionString { get; set; }
    public int RedisDatabase { get; set; } = 0;
}