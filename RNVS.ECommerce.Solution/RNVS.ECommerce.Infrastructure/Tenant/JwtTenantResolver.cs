using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace RNVS.ECommerce.Infrastructure.Tenant;

/// <summary>
/// Reads the vendorId from the Bearer JWT claim.
/// UserId == VendorId in this system — vendors are identified by their ASP.NET Identity user ID.
/// </summary>
public class JwtTenantResolver : ITenantResolver
{
    public string? ResolveVendorId(HttpContext context)
    {
        return context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
