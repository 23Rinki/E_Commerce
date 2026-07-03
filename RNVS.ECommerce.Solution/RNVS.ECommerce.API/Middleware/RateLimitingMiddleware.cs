using System.Collections.Concurrent;
using System.Net;

namespace RNVS.ECommerce.API.Middleware
{
    public class RateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RateLimitingMiddleware> _logger;
        private readonly bool _enabled;
        private readonly int _generalLimit;
        private readonly TimeSpan _generalWindow;
        private readonly int _authLimit;
        private readonly TimeSpan _authWindow;

        // Per-client sliding window: key = "ip:bucket", value = timestamps of requests
        private static readonly ConcurrentDictionary<string, Queue<DateTime>> _requestLog = new();
        private static readonly object _lock = new();

        public RateLimitingMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<RateLimitingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
            _enabled = configuration.GetValue<bool>("RateLimiting:EnableRateLimiting");
            _generalLimit = configuration.GetValue("RateLimiting:GeneralLimit:PermitLimit", 100);
            _generalWindow = configuration.GetValue("RateLimiting:GeneralLimit:Window", TimeSpan.FromMinutes(1));
            _authLimit = configuration.GetValue("RateLimiting:AuthLimit:PermitLimit", 5);
            _authWindow = configuration.GetValue("RateLimiting:AuthLimit:Window", TimeSpan.FromMinutes(1));
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (!_enabled)
            {
                await _next(context);
                return;
            }

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var path = context.Request.Path.Value?.ToLower() ?? "";

            // Only apply tight auth limit to brute-force-sensitive endpoints.
            // /api/auth/me and /api/auth/refresh-token are called on every page load — use general limit.
            var isSensitiveAuthRoute = path == "/api/auth/login"
                || path == "/api/auth/register"
                || path == "/api/auth/employee-login"
                || path == "/api/auth/forgot-password"
                || path == "/api/auth/reset-password";

            var limit  = isSensitiveAuthRoute ? _authLimit   : _generalLimit;
            var window = isSensitiveAuthRoute ? _authWindow  : _generalWindow;
            var key    = $"{ip}:{(isSensitiveAuthRoute ? "auth" : "general")}";

            if (IsRateLimited(key, limit, window))
            {
                _logger.LogWarning("Rate limit exceeded for IP {IP} on {Path}", ip, path);
                context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                context.Response.Headers["Retry-After"] = ((int)window.TotalSeconds).ToString();
                await context.Response.WriteAsJsonAsync(new
                {
                    success = false,
                    message = "Too many requests. Please try again later."
                });
                return;
            }

            await _next(context);
        }

        private static bool IsRateLimited(string key, int limit, TimeSpan window)
        {
            var now = DateTime.UtcNow;
            var windowStart = now - window;

            lock (_lock)
            {
                if (!_requestLog.TryGetValue(key, out var timestamps))
                {
                    timestamps = new Queue<DateTime>();
                    _requestLog[key] = timestamps;
                }

                // Drop timestamps outside the current window
                while (timestamps.Count > 0 && timestamps.Peek() < windowStart)
                    timestamps.Dequeue();

                if (timestamps.Count >= limit)
                    return true;

                timestamps.Enqueue(now);
                return false;
            }
        }
    }
}
