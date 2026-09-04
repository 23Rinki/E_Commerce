using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using System.Text.Json;

namespace RNVS.ECommerce.Infrastructure.Caching;

public class RedisCacheService : ICacheService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _database;
    private readonly ILogger<RedisCacheService> _logger;
    private readonly CacheOptions _options;
    private readonly JsonSerializerOptions _jsonOptions;

    public RedisCacheService(
        IConnectionMultiplexer redis,
        ILogger<RedisCacheService> logger,
        IOptions<CacheOptions> options)
    {
        _redis = redis ?? throw new ArgumentNullException(nameof(redis));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
        _database = _redis.GetDatabase(_options.RedisDatabase);

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                _logger.LogWarning("Attempted to get cache with null or empty key");
                return default;
            }

            var value = await _database.StringGetAsync(key);

            if (!value.HasValue)
            {
                _logger.LogDebug("Cache miss for key: {Key}", key);
                return default;
            }

            _logger.LogDebug("Cache hit for key: {Key}", key);

            // Deserialize JSON to object
            var deserializedValue = JsonSerializer.Deserialize<T>(value!, _jsonOptions);
            return deserializedValue;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache key from Redis: {Key}", key);
            return default;
        }
    }

    public async Task<bool> SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                _logger.LogWarning("Attempted to set cache with null or empty key");
                return false;
            }

            if (value == null)
            {
                _logger.LogWarning("Attempted to set cache with null value for key: {Key}", key);
                return false;
            }

            var cacheExpiration = expiration ?? _options.DefaultExpiration;

            // Serialize object to JSON
            var serializedValue = JsonSerializer.Serialize(value, _jsonOptions);

            var success = await _database.StringSetAsync(key, serializedValue, cacheExpiration);

            if (success)
            {
                _logger.LogDebug("Cache set in Redis for key: {Key} with expiration: {Expiration}", key, cacheExpiration);
            }
            else
            {
                _logger.LogWarning("Failed to set cache in Redis for key: {Key}", key);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting cache key in Redis: {Key}", key);
            return false;
        }
    }

    public async Task<bool> RemoveAsync(string key)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                _logger.LogWarning("Attempted to remove cache with null or empty key");
                return false;
            }

            var success = await _database.KeyDeleteAsync(key);

            if (success)
            {
                _logger.LogDebug("Cache removed from Redis for key: {Key}", key);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache key from Redis: {Key}", key);
            return false;
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return false;
            }

            var exists = await _database.KeyExistsAsync(key);
            return exists;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking cache key existence in Redis: {Key}", key);
            return false;
        }
    }

    public async Task<Dictionary<string, T?>> GetManyAsync<T>(IEnumerable<string> keys)
    {
        var result = new Dictionary<string, T?>();

        try
        {
            var keysList = keys.ToList();
            var redisKeys = keysList.Select(k => (RedisKey)k).ToArray();
            var values = await _database.StringGetAsync(redisKeys);

            for (int i = 0; i < keysList.Count; i++)
            {
                if (values[i].HasValue)
                {
                    var deserializedValue = JsonSerializer.Deserialize<T>(values[i]!, _jsonOptions);
                    result[keysList[i]] = deserializedValue;
                }
                else
                {
                    result[keysList[i]] = default;
                }
            }

            _logger.LogDebug("Retrieved {Count} keys from Redis", keysList.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting multiple cache keys from Redis");
        }

        return result;
    }

    public async Task<bool> SetManyAsync<T>(Dictionary<string, T> items, TimeSpan? expiration = null)
    {
        try
        {
            var cacheExpiration = expiration ?? _options.DefaultExpiration;
            var batch = _database.CreateBatch();
            var tasks = new List<Task<bool>>();

            foreach (var item in items)
            {
                var serializedValue = JsonSerializer.Serialize(item.Value, _jsonOptions);
                var task = batch.StringSetAsync(item.Key, serializedValue, cacheExpiration);
                tasks.Add(task);
            }

            batch.Execute();
            await Task.WhenAll(tasks);

            var allSuccess = tasks.All(t => t.Result);

            if (allSuccess)
            {
                _logger.LogDebug("Set {Count} keys in Redis", items.Count);
            }

            return allSuccess;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting multiple cache keys in Redis");
            return false;
        }
    }

    public async Task<bool> RemoveManyAsync(IEnumerable<string> keys)
    {
        try
        {
            var keysList = keys.ToList();
            var redisKeys = keysList.Select(k => (RedisKey)k).ToArray();

            var deletedCount = await _database.KeyDeleteAsync(redisKeys);

            _logger.LogDebug("Removed {Count} keys from Redis", deletedCount);
            return deletedCount > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing multiple cache keys from Redis");
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

    public async Task<bool> RemoveByPatternAsync(string pattern)
    {
        try
        {
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys = server.Keys(database: _options.RedisDatabase, pattern: pattern).ToArray();

            if (keys.Length == 0)
            {
                _logger.LogDebug("No keys found matching pattern: {Pattern}", pattern);
                return true;
            }

            var deletedCount = await _database.KeyDeleteAsync(keys);

            _logger.LogInformation("Removed {Count} cache keys from Redis matching pattern: {Pattern}", deletedCount, pattern);
            return deletedCount > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache keys by pattern from Redis: {Pattern}", pattern);
            return false;
        }
    }

    public async Task<bool> ClearAllAsync()
    {
        try
        {
            var endpoints = _redis.GetEndPoints();

            foreach (var endpoint in endpoints)
            {
                var server = _redis.GetServer(endpoint);
                await server.FlushDatabaseAsync(_options.RedisDatabase);
            }

            _logger.LogInformation("Cleared all cache keys from Redis database: {Database}", _options.RedisDatabase);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing all cache from Redis");
            return false;
        }
    }

    public async Task<long> GetCacheSizeAsync()
    {
        try
        {
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys = server.Keys(database: _options.RedisDatabase);
            var count = keys.LongCount();

            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache size from Redis");
            return 0;
        }
    }

    public async Task<IEnumerable<string>> GetAllKeysAsync()
    {
        try
        {
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys = server.Keys(database: _options.RedisDatabase)
                .Select(k => k.ToString())
                .ToList();

            return keys;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all keys from Redis");
            return Enumerable.Empty<string>();
        }
    }
}