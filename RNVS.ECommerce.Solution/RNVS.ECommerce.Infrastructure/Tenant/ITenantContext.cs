namespace RNVS.ECommerce.Infrastructure.Tenant;

/// <summary>
/// Holds resolved tenant info for the current HTTP request.
/// Injected scoped — resolved once per request.
/// </summary>
public interface ITenantContext
{
    /// <summary>The vendorId (ASP.NET Identity UserId) of the current request's vendor.</summary>
    string? VendorId { get; }

    /// <summary>
    /// The PostgreSQL connection string to use for this request.
    /// Phase 1: always returns the default shared connection string.
    /// Phase 2: returns the vendor's dedicated Railway DB URL.
    /// </summary>
    string ConnectionString { get; }

    /// <summary>
    /// S3/Azure Blob storage prefix for this vendor's files.
    /// e.g. "vendor-abc123/products/"
    /// </summary>
    string StoragePrefix { get; }
}
