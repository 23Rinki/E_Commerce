using Microsoft.AspNetCore.Http;

namespace RNVS.ECommerce.Infrastructure.Tenant;

/// <summary>
/// Extracts the vendor identity from the current HTTP request.
/// Implementation reads the JWT claim (NameIdentifier = userId = vendorId).
/// </summary>
public interface ITenantResolver
{
    string? ResolveVendorId(HttpContext context);
}
