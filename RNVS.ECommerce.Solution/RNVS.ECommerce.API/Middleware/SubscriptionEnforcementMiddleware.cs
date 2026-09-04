using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Middleware;

/// <summary>
/// Blocks Vendor/Employee requests once the vendor's tenant is Suspended (payment overdue
/// past the grace period — see DailyEmailSchedulerService). Auth endpoints stay reachable
/// so a suspended vendor can still log in, check their status, and pay to reactivate.
/// </summary>
public class SubscriptionEnforcementMiddleware
{
    private readonly RequestDelegate _next;

    public SubscriptionEnforcementMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext db)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        // Always allow auth endpoints — login, refresh, logout, "who am I", and the
        // payment-confirmation endpoint the suspended vendor needs to reactivate.
        if (path.StartsWith("/api/auth/"))
        {
            await _next(context);
            return;
        }

        var user = context.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value;

        string? vendorId = roleClaim switch
        {
            "2" or "Vendor"   => user.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            "3" or "Employee" => user.FindFirst("vendorid")?.Value,
            _                 => null,
        };

        if (string.IsNullOrEmpty(vendorId))
        {
            await _next(context);
            return;
        }

        var tenant = await db.TenantRegistrations
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.VendorId == vendorId);

        if (tenant?.Status == TenantStatus.Suspended)
        {
            context.Response.StatusCode = StatusCodes.Status402PaymentRequired;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                suspended = true,
                message = "Your subscription payment is overdue and your account is suspended. Please complete payment to reactivate your store."
            });
            return;
        }

        await _next(context);
    }
}
