using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;
using System.Text.Json;

namespace RNVS.ECommerce.Infrastructure.Caching;

public class MemoryCacheService : ICacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<MemoryCacheService> _logger;
    private readonly CacheOptions _options;
    private readonly ConcurrentDictionary<string, byte> _cacheKeys;

    public MemoryCacheService(
        IMemoryCache memoryCache,
        ILogger<MemoryCacheService> logger,
        IOptions<CacheOptions> options)
    {
        _memoryCache = memoryCache ?? throw new ArgumentNullException(nameof(memoryCache));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
        _cacheKeys = new ConcurrentDictionary<string, byte>();
    }

    public Task<T?> GetAsync<T>(string key)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                _logger.LogWarning("Attempted to get cache with null or empty key");
                return Task.FromResult(default(T));
            }

            if (_memoryCache.TryGetValue(key, out T? value))
            {
                _logger.LogDebug("Cache hit for key: {Key}", key);
                return Task.FromResult(value);
            }

            _logger.LogDebug("Cache miss for key: {Key}", key);
            return Task.FromResult(default(T));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache key: {Key}", key);
            return Task.FromResult(default(T));
        }
    }

    public Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                _logger.LogWarning("Attempted to set cache with null or empty key");
                return Task.FromResult(false);
            }

            if (value == null)
            {
                _logger.LogWarning("Attempted to set cache with null value for key: {Key}", key);
                return Task.FromResult(false);
            }

            var cacheExpiration = expiration ?? _options.DefaultExpiration;
            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = cacheExpiration,
                SlidingExpiration = _options.SlidingExpiration
            };

            _memoryCache.Set(key, value, cacheEntryOptions);
            _cacheKeys.TryAdd(key, 0);

            _logger.LogDebug("Cache set for key: {Key} with expiration: {Expiration}", key, cacheExpiration);
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting cache key: {Key}", key);
            return Task.FromResult(false);
        }
    }

    public Task<bool> RemoveAsync(string key)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                _logger.LogWarning("Attempted to remove cache with null or empty key");
                return Task.FromResult(false);
            }

            _memoryCache.Remove(key);
            _cacheKeys.TryRemove(key, out _);

            _logger.LogDebug("Cache removed for key: {Key}", key);
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache key: {Key}", key);
            return Task.FromResult(false);
        }
    }

    public Task<bool> ExistsAsync(string key)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return Task.FromResult(false);
            }

            var exists = _memoryCache.TryGetValue(key, out _);
            return Task.FromResult(exists);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking cache key existence: {Key}", key);
            return Task.FromResult(false);
        }
    }

    public async Task<Dictionary<string, T?>> GetManyAsync<T>(IEnumerable<string> keys)
    {
        var result = new Dictionary<string, T?>();

        foreach (var key in keys)
        {
            var value = await GetAsync<T>(key);
            result[key] = value;
        }

        return result;
    }

    public async Task<bool> SetManyAsync<T>(Dictionary<string, T> items, TimeSpan? expiration = null)
    {
        try
        {
            foreach (var item in items)
            {
                await SetAsync(item.Key, item.Value, expiration);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting multiple cache keys");
            return false;
        }
    }

    public async Task<bool> RemoveManyAsync(IEnumerable<string> keys)
    {
        try
        {
            foreach (var key in keys)
            {
                await RemoveAsync(key);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing multiple cache keys");
            return false;
        }
    }

    public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null)
    {
        try
        {
            // Try to get from cache first
            var cachedValue = await GetAsync<T>(key);
            if (cachedValue != null)
            {
                return cachedValue;
            }

            // If not in cache, execute factory
            _logger.LogDebug("Cache miss for key: {Key}, executing factory method", key);
            var value = await factory();

            if (value != null)
            {
                await SetAsync(key, value, expiration);
            }

            return value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetOrSetAsync for key: {Key}", key);
            return default;
        }
    }

    public Task<bool> RemoveByPatternAsync(string pattern)
    {
        try
        {
            var keysToRemove = _cacheKeys.Keys
                .Where(k => IsPatternMatch(k, pattern))
                .ToList();

            foreach (var key in keysToRemove)
            {
                _memoryCache.Remove(key);
                _cacheKeys.TryRemove(key, out _);
            }

            _logger.LogInformation("Removed {Count} cache keys matching pattern: {Pattern}", keysToRemove.Count, pattern);
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache keys by pattern: {Pattern}", pattern);
            return Task.FromResult(false);
        }
    }

    public Task<bool> ClearAllAsync()
    {
        try
        {
            var allKeys = _cacheKeys.Keys.ToList();
            foreach (var key in allKeys)
            {
                _memoryCache.Remove(key);
            }

            _cacheKeys.Clear();

            _logger.LogInformation("Cleared all cache keys. Total keys removed: {Count}", allKeys.Count);
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing all cache");
            return Task.FromResult(false);
        }
    }

    public Task<long> GetCacheSizeAsync()
    {
        return Task.FromResult((long)_cacheKeys.Count);
    }

    public Task<IEnumerable<string>> GetAllKeysAsync()
    {
        return Task.FromResult<IEnumerable<string>>(_cacheKeys.Keys.ToList());
    }

    private bool IsPatternMatch(string key, string pattern)
    {
        // Simple wildcard pattern matching
        // Supports * as wildcard
        if (pattern.EndsWith("*"))
        {
            var prefix = pattern.TrimEnd('*');
            return key.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
        }

        if (pattern.StartsWith("*"))
        {
            var suffix = pattern.TrimStart('*');
            return key.EndsWith(suffix, StringComparison.OrdinalIgnoreCase);
        }

        return key.Equals(pattern, StringComparison.OrdinalIgnoreCase);
    }
}