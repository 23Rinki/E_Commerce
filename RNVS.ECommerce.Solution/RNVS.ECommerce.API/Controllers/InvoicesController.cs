using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Infrastructure.Data;
using System.Globalization;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<InvoicesController> _logger;

    public InvoicesController(VendorDbContext context, ILogger<InvoicesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Generates a filled invoice HTML for an order using the vendor's saved default template.
    /// Accessible by: vendor/employee (any order in their DB) and customer (their own orders only).
    /// Returns text/html — open in browser tab, then Ctrl+P to save as PDF.
    /// </summary>
    [HttpGet("generate/{orderId:int}")]
    public async Task<IActionResult> GenerateInvoice(int orderId)
    {
        try
        {
            var userId    = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value
                         ?? User.FindFirst("role")?.Value
                         ?? string.Empty;

            bool isVendorOrStaff = roleClaim is "2" or "Vendor" or "3" or "Employee"
                                             or "4" or "Admin" or "5" or "SuperAdmin";

            // Load order
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Order not found" });

            // Customers can only access their own orders
            if (!isVendorOrStaff && order.UserId != userId)
                return Forbid();

            // Load items
            var items = await _context.OrderItems
                .Where(i => i.OrderId == orderId)
                .ToListAsync();

            // Shipping address — best match for this user in the vendor DB
            var address = await _context.Addresses
                .Where(a => a.UserId == order.UserId)
                .OrderByDescending(a => a.IsDefault)
                .FirstOrDefaultAsync();

            // Vendor branding (store name, address, GSTIN)
            var branding = await _context.BrandingSettings.FirstOrDefaultAsync();

            // Default active invoice template
            var template = await _context.InvoiceTemplates
                .Where(t => t.IsDefault && t.IsActive)
                .FirstOrDefaultAsync()
                ?? await _context.InvoiceTemplates.FirstOrDefaultAsync();

            if (template == null)
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "No invoice template found. Go to Vendor → Invoices and select a template first."
                });

            // Build <tbody> rows for the items table (6 columns: Description, HSN, Qty, Unit Price, Taxable, Total)
            var itemsHtml = string.Join("\n", items.Select(item =>
                $"<tr>" +
                $"<td>{Encode(item.ProductName)}</td>" +
                $"<td>N/A</td>" +
                $"<td>{item.Quantity}</td>" +
                $"<td>{Fmt(item.UnitPrice)}</td>" +
                $"<td>{Fmt(item.TotalPrice)}</td>" +
                $"<td>{Fmt(item.TotalPrice)}</td>" +
                $"</tr>"
            ));

            // Customer details
            var customerName   = address != null ? $"{address.FirstName} {address.LastName}".Trim() : "Customer";
            var shippingAddr   = address != null
                ? string.Join(", ", new[] { address.Street, address.City, address.State, address.PostalCode, address.Country }
                    .Where(s => !string.IsNullOrWhiteSpace(s)))
                : "—";
            var placeOfSupply  = address?.State ?? "—";

            // For customers: use their email claim. For vendor viewing: use userId if it looks like an email, else "—"
            var customerEmail = isVendorOrStaff
                ? (order.UserId.Contains('@') ? order.UserId : "—")
                : (User.FindFirstValue(ClaimTypes.Email) ?? "—");

            // GST split: 18% total = CGST 9% + SGST 9%
            var cgst = order.TaxAmount / 2m;
            var sgst = order.TaxAmount / 2m;

            // Fill all placeholders
            var html = template.HtmlTemplate
                .Replace("{{StoreName}}",       Encode(branding?.StoreName    ?? "Store"))
                .Replace("{{StoreAddress}}",    Encode(branding?.StoreAddress ?? ""))
                .Replace("{{VendorGSTIN}}",     Encode(branding?.GstNumber    ?? "Not Registered"))
                .Replace("{{InvoiceNumber}}",   $"INV-{order.Id:D6}")
                .Replace("{{OrderNumber}}",     Encode(order.OrderNumber))
                .Replace("{{OrderDate}}",       order.CreatedAt.ToLocalTime().ToString("dd MMM yyyy", CultureInfo.InvariantCulture))
                .Replace("{{PlaceOfSupply}}",   Encode(placeOfSupply))
                .Replace("{{CustomerName}}",    Encode(customerName))
                .Replace("{{CustomerEmail}}",   Encode(customerEmail))
                .Replace("{{CustomerGSTIN}}",   Encode(string.IsNullOrWhiteSpace(order.CustomerGSTIN) ? "—" : order.CustomerGSTIN))
                .Replace("{{ShippingAddress}}", Encode(shippingAddr))
                .Replace("{{PaymentMethod}}",   "—")
                .Replace("{{Items}}",           itemsHtml)
                .Replace("{{TaxableAmount}}",   Fmt(order.SubTotal))
                .Replace("{{CGST}}",            Fmt(cgst))
                .Replace("{{SGST}}",            Fmt(sgst))
                .Replace("{{Shipping}}",        order.ShippingCost == 0 ? "FREE" : Fmt(order.ShippingCost))
                .Replace("{{TotalAmount}}",     Fmt(order.TotalAmount));

            _logger.LogInformation("Invoice generated for order {OrderId}", orderId);
            return Content(html, "text/html");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating invoice for order {OrderId}", orderId);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Failed to generate invoice" });
        }
    }

    private static string Fmt(decimal amount) => $"&#8377;{amount:N2}";
    private static string Encode(string? s)   => System.Net.WebUtility.HtmlEncode(s ?? string.Empty);
}
