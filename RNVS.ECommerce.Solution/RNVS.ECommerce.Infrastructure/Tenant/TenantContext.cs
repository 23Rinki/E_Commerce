using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RNVS.ECommerce.Domain.Entities.Platform;
using RNVS.ECommerce.Infrastructure.Data;
using System.Collections.Concurrent;

namespace RNVS.ECommerce.Infrastructure.Tenant;

/// <summary>
/// Resolves and caches the current tenant's database connection string and storage prefix.
/// Scoped — created once per HTTP request.
/// </summary>
public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ITenantResolver _resolver;
    private readonly ApplicationDbContext _db;
    private readonly string _defaultConnectionString;

    // Per-request cache — resolved once via InitializeAsync, then read-only
    private string? _vendorId;
    private TenantRegistration? _tenant;
    private bool _initialized = false;

    // In-memory throttle: only write LastActivityAt at most once every 5 minutes per vendor
    private static readonly ConcurrentDictionary<string, DateTime> _lastTouch = new();
    private static readonly TimeSpan _touchInterval = TimeSpan.FromMinutes(5);

    public TenantContext(
        IHttpContextAccessor httpContextAccessor,
        ITenantResolver resolver,
        ApplicationDbContext db,
        IConfiguration configuration)
    {
        _httpContextAccessor = httpContextAccessor;
        _resolver = resolver;
        _db = db;
        _defaultConnectionString = configuration.GetConnectionString("VendorConnection")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("VendorConnection (or DefaultConnection) not found in configuration.");
    }

    /// <summary>
    /// Call this once at the start of the request (from TenantActivityMiddleware) to
    /// do the async DB lookup. All property accessors use the cached result — no DB calls.
    /// </summary>
    public async Task InitializeAsync()
    {
        if (_initialized) return;
        _initialized = true;

        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null) return;

        _vendorId = _resolver.ResolveVendorId(httpContext);
        if (string.IsNullOrEmpty(_vendorId)) return;

        _tenant = await _db.TenantRegistrations
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.VendorId == _vendorId);
    }

    public string? VendorId => _vendorId;

    public string ConnectionString =>
        _tenant?.RailwayDatabaseUrl ?? _defaultConnectionString;

    public string StoragePrefix =>
        _tenant?.StoragePrefix ?? $"vendor-{_vendorId ?? "shared"}/products/";

    /// <summary>
    /// Updates LastActivityAt, but at most once every 5 minutes per vendor to avoid
    /// a DB write on every single API request.
    /// </summary>
    public async Task TouchLastActivityAsync()
    {
        if (string.IsNullOrEmpty(_vendorId) || _tenant == null) return;

        var now = DateTime.UtcNow;
        if (_lastTouch.TryGetValue(_vendorId, out var last) && (now - last) < _touchInterval)
            return;

        _lastTouch[_vendorId] = now;

        // Re-fetch as tracked entity so we can update it
        var tracked = await _db.TenantRegistrations
            .FirstOrDefaultAsync(t => t.VendorId == _vendorId);

        if (tracked != null)
        {
            tracked.LastActivityAt = now;
            await _db.SaveChangesAsync();
        }
    }
}
