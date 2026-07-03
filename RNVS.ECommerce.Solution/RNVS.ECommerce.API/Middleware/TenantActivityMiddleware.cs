using RNVS.ECommerce.Infrastructure.Tenant;

namespace RNVS.ECommerce.API.Middleware;

public class TenantActivityMiddleware
{
    private readonly RequestDelegate _next;

    public TenantActivityMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext)
    {
        // Resolve tenant once (async) before the request hits any controller.
        // All downstream code reads the cached result — no blocking sync DB calls.
        await tenantContext.InitializeAsync();

        await _next(context);

        // After response: update last activity, throttled to once every 5 min per vendor.
        if (context.User?.Identity?.IsAuthenticated == true && !string.IsNullOrEmpty(tenantContext.VendorId))
        {
            try
            {
                await tenantContext.TouchLastActivityAsync();
            }
            catch
            {
                // Never let activity tracking break a vendor's request
            }
        }
    }
}
