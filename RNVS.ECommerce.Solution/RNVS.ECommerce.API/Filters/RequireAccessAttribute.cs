using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Filters;

/// <summary>
/// Enforces designation-based access for vendor employees.
/// Vendors (role 2) and Admins (role 4/5) are always allowed.
/// Employees (role 3) are only allowed if their designation grants access to the slug.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireAccessAttribute : Attribute, IAuthorizationFilter
{
    private readonly string _slug;

    // Mirrors frontend src/lib/permissions.ts DESIGNATION_ACCESS
    private static readonly Dictionary<string, HashSet<string>> DesignationAccess = new()
    {
        ["Manager"]         = ["dashboard", "products", "orders", "inventory", "employees", "receipts", "settings"],
        ["Sales Staff"]     = ["dashboard", "products", "orders"],
        ["Support"]         = ["dashboard", "orders"],
        ["Cashier"]         = ["dashboard", "orders", "receipts"],
        ["Warehouse Staff"] = ["dashboard", "inventory"],
        ["Delivery Staff"]  = ["dashboard", "orders"],
    };

    public RequireAccessAttribute(string slug)
    {
        _slug = slug;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        // Not authenticated — let [Authorize] on the action handle it
        if (user.Identity?.IsAuthenticated != true)
            return;

        var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value
                     ?? user.FindFirst("role")?.Value;

        // Vendors (2), Admins (4, 5) — full access
        if (roleClaim is "2" or "Vendor" or "4" or "Admin" or "5" or "SuperAdmin")
            return;

        // Employees (3) — check designation
        if (roleClaim is "3" or "Employee")
        {
            var designation = user.FindFirst("designation")?.Value ?? string.Empty;

            if (DesignationAccess.TryGetValue(designation, out var allowed) && allowed.Contains(_slug))
                return;

            context.Result = new ObjectResult(new
            {
                success = false,
                message = $"Your role ({designation}) does not have access to this section."
            })
            { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }

        // Any other role — deny
        context.Result = new ForbidResult();
    }
}
