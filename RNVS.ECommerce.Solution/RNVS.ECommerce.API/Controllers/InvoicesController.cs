using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Infrastructure.Data;
using RNVS.ECommerce.Infrastructure.PDF;
using RNVS.ECommerce.Infrastructure.PDF.Models;
using System.Globalization;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ApplicationDbContext _mainDb;
    private readonly PdfInvoiceGenerator _pdfInvoiceGenerator;
    private readonly ILogger<InvoicesController> _logger;

    public InvoicesController(VendorDbContext context, ApplicationDbContext mainDb, PdfInvoiceGenerator pdfInvoiceGenerator, ILogger<InvoicesController> logger)
    {
        _context = context;
        _mainDb = mainDb;
        _pdfInvoiceGenerator = pdfInvoiceGenerator;
        _logger = logger;
    }

    // Falls back to the customer's real account name/email/phone when no shipping address is on file.
    private async Task<(string Name, string Email, string Phone)> ResolveCustomerFallbackAsync(string userId)
    {
        var user = await _mainDb.Users.FindAsync(userId);
        if (user == null) return ("Customer", "—", "—");
        var name = $"{user.FirstName} {user.LastName}".Trim();
        return (string.IsNullOrWhiteSpace(name) ? "Customer" : name, user.Email ?? "—", user.PhoneNumber ?? "—");
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

            // Vendor branding (store name, address, GSTIN, logo)
            var branding = await _context.BrandingSettings.FirstOrDefaultAsync();

            var logoUrl = branding?.LogoUrl;
            var logoAbsoluteUrl = string.IsNullOrWhiteSpace(logoUrl)
                ? null
                : (logoUrl.StartsWith("http") ? logoUrl : $"{Request.Scheme}://{Request.Host}{logoUrl}");
            var logoHtml = logoAbsoluteUrl != null
                ? $"<img src=\"{logoAbsoluteUrl}\" alt=\"logo\" style=\"max-height:48px;max-width:140px;object-fit:contain;margin-bottom:8px;\" />"
                : "";

            // Vendor's chosen color/font — overrides each template's own palette, applied via a
            // late <style> block so it wins without needing to rewrite every template's CSS.
            var primaryColor = string.IsNullOrWhiteSpace(branding?.PrimaryColor) ? "#1a1a6e" : branding!.PrimaryColor;
            var fontFamily   = string.IsNullOrWhiteSpace(branding?.FontFamily)   ? "Arial"    : branding!.FontFamily;
            var styleOverrideHtml = """
                <style>
                  body, .page { font-family: '%%FONT%%', Arial, sans-serif !important; }
                  .header, thead tr { background: %%PRIMARY%% !important; background-image: none !important; }
                  .store-name, .invoice-badge, .inv-title, .inv-badge, .accent-bar, .stripe, .accent { color: %%PRIMARY%% !important; }
                  .grand-total, .grand, .total-grand, .total-row.grand { background: %%PRIMARY%% !important; background-image: none !important; color: #fff !important; }
                  .grand-value { color: #fff !important; }
                </style>
                """
                .Replace("%%FONT%%", fontFamily)
                .Replace("%%PRIMARY%%", primaryColor);

            // Bill Fields + Customer Details — only fields the vendor actually typed a fixed value for
            // (blank ones are meant to auto-fill per-order, which this generic list has no data for)
            var extraFieldsHtml = "";
            try
            {
                var allFields = new List<(string Label, string Value)>();
                foreach (var json in new[] { branding?.BillFieldsJson, branding?.CustomerFieldsJson })
                {
                    if (string.IsNullOrWhiteSpace(json)) continue;
                    var fields = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, string>>>(json);
                    if (fields == null) continue;
                    foreach (var f in fields)
                        if (f.TryGetValue("label", out var label) && f.TryGetValue("value", out var value) && !string.IsNullOrWhiteSpace(value))
                            allFields.Add((label, value));
                }
                if (allFields.Count > 0)
                {
                    var rows = string.Join("", allFields.Select(f =>
                        $"<div style=\"display:flex;justify-content:space-between;font-size:11px;padding:2px 0;\">" +
                        $"<span style=\"color:#888;\">{Encode(f.Label)}</span><span style=\"font-weight:600;\">{Encode(f.Value)}</span></div>"));
                    extraFieldsHtml = $"<div style=\"margin-bottom:16px;padding:10px 14px;background:#f8f8f8;border-radius:8px;\">{rows}</div>";
                }
            }
            catch (System.Text.Json.JsonException ex)
            {
                _logger.LogWarning(ex, "Could not parse BillFieldsJson/CustomerFieldsJson for invoice extra fields");
            }

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

            // Customer details — prefer the order's own frozen shipping snapshot (captured at purchase
            // time); fall back to a live Addresses lookup, then to bare account info for old orders
            // placed before this snapshot existed.
            string customerName, customerEmail, customerPhone, shippingAddr, placeOfSupply;
            if (!string.IsNullOrWhiteSpace(order.ShippingStreet))
            {
                customerName = order.ShippingName ?? "Customer";
                customerPhone = string.IsNullOrWhiteSpace(order.ShippingPhone) ? "—" : order.ShippingPhone;
                customerEmail = isVendorOrStaff
                    ? (order.UserId.Contains('@') ? order.UserId : "—")
                    : (User.FindFirstValue(ClaimTypes.Email) ?? "—");
                shippingAddr = string.Join(", ", new[] { order.ShippingStreet, order.ShippingCity, order.ShippingState, order.ShippingPostalCode, order.ShippingCountry }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
                placeOfSupply = order.ShippingState ?? "—";
            }
            else if (address != null)
            {
                customerName = $"{address.FirstName} {address.LastName}".Trim();
                customerEmail = isVendorOrStaff
                    ? (order.UserId.Contains('@') ? order.UserId : "—")
                    : (User.FindFirstValue(ClaimTypes.Email) ?? "—");
                // Address has no phone field — always pull phone from the customer's own account
                (_, _, customerPhone) = await ResolveCustomerFallbackAsync(order.UserId);
                shippingAddr = string.Join(", ", new[] { address.Street, address.City, address.State, address.PostalCode, address.Country }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
                placeOfSupply = address.State ?? "—";
            }
            else
            {
                (customerName, customerEmail, customerPhone) = await ResolveCustomerFallbackAsync(order.UserId);
                shippingAddr = "—";
                placeOfSupply = "—";
            }

            // GST split: 18% total = CGST 9% + SGST 9%
            var cgst = order.TaxAmount / 2m;
            var sgst = order.TaxAmount / 2m;

            // Fill all placeholders
            var html = template.HtmlTemplate
                .Replace("{{Logo}}",            logoHtml)
                .Replace("{{StyleOverride}}",   styleOverrideHtml)
                .Replace("{{ExtraFields}}",     extraFieldsHtml)
                .Replace("{{StoreName}}",       Encode(branding?.StoreName    ?? "Store"))
                .Replace("{{StoreAddress}}",    Encode(branding?.StoreAddress ?? ""))
                .Replace("{{VendorGSTIN}}",     Encode(branding?.GstNumber    ?? "Not Registered"))
                .Replace("{{InvoiceNumber}}",   $"INV-{order.Id:D6}")
                .Replace("{{OrderNumber}}",     Encode(order.OrderNumber))
                .Replace("{{OrderDate}}",       order.CreatedAt.ToLocalTime().ToString("dd MMM yyyy", CultureInfo.InvariantCulture))
                .Replace("{{PlaceOfSupply}}",   Encode(placeOfSupply))
                .Replace("{{CustomerName}}",    Encode(customerName))
                .Replace("{{CustomerEmail}}",   Encode(customerEmail))
                .Replace("{{CustomerPhone}}",   Encode(customerPhone))
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

    /// <summary>
    /// Generates a real downloadable PDF invoice file for an order (QuestPDF-based — a separate,
    /// fixed layout from the HTML templates, but includes proper CGST/SGST GST breakdown).
    /// </summary>
    [HttpGet("download/{orderId:int}")]
    public async Task<IActionResult> DownloadInvoicePdf(int orderId)
    {
        try
        {
            var userId    = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value
                         ?? User.FindFirst("role")?.Value
                         ?? string.Empty;

            bool isVendorOrStaff = roleClaim is "2" or "Vendor" or "3" or "Employee"
                                             or "4" or "Admin" or "5" or "SuperAdmin";

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Order not found" });

            if (!isVendorOrStaff && order.UserId != userId)
                return Forbid();

            var items = await _context.OrderItems
                .Where(i => i.OrderId == orderId)
                .ToListAsync();

            var address = await _context.Addresses
                .Where(a => a.UserId == order.UserId)
                .OrderByDescending(a => a.IsDefault)
                .FirstOrDefaultAsync();

            var branding = await _context.BrandingSettings.FirstOrDefaultAsync();

            string customerName, customerEmail, customerPhone, shippingAddr;
            if (!string.IsNullOrWhiteSpace(order.ShippingStreet))
            {
                customerName = order.ShippingName ?? "Customer";
                customerPhone = string.IsNullOrWhiteSpace(order.ShippingPhone) ? "—" : order.ShippingPhone;
                customerEmail = isVendorOrStaff
                    ? (order.UserId.Contains('@') ? order.UserId : "—")
                    : (User.FindFirstValue(ClaimTypes.Email) ?? "—");
                shippingAddr = string.Join(", ", new[] { order.ShippingStreet, order.ShippingCity, order.ShippingState, order.ShippingPostalCode, order.ShippingCountry }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
            }
            else if (address != null)
            {
                customerName = $"{address.FirstName} {address.LastName}".Trim();
                customerEmail = isVendorOrStaff
                    ? (order.UserId.Contains('@') ? order.UserId : "—")
                    : (User.FindFirstValue(ClaimTypes.Email) ?? "—");
                // Address has no phone field — always pull phone from the customer's own account
                var (_, _, addrCasePhone) = await ResolveCustomerFallbackAsync(order.UserId);
                customerPhone = addrCasePhone;
                shippingAddr = string.Join(", ", new[] { address.Street, address.City, address.State, address.PostalCode, address.Country }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
            }
            else
            {
                (customerName, customerEmail, customerPhone) = await ResolveCustomerFallbackAsync(order.UserId);
                shippingAddr = "—";
            }

            var logoUrl = branding?.LogoUrl;
            var logoAbsoluteUrl = string.IsNullOrWhiteSpace(logoUrl)
                ? ""
                : (logoUrl.StartsWith("http") ? logoUrl : $"{Request.Scheme}://{Request.Host}{logoUrl}");

            var data = new InvoiceData
            {
                InvoiceNumber = $"INV-{order.Id:D6}",
                OrderId       = order.OrderNumber,
                IssueDate     = order.CreatedAt,
                DueDate       = order.CreatedAt,
                Terms         = "Due on Receipt",
                InvoiceStatus = "Paid",
                Company = new CompanyInfo
                {
                    Name          = branding?.StoreName ?? "Store",
                    LogoUrl       = logoAbsoluteUrl,
                    Address       = branding?.StoreAddress ?? "",
                    Phone         = branding?.StorePhone ?? "",
                    Email         = branding?.StoreEmail ?? "",
                    Website       = branding?.Website ?? "",
                    TaxId         = string.IsNullOrWhiteSpace(branding?.GstNumber) ? "Not Registered" : branding.GstNumber,
                    PrimaryColor  = string.IsNullOrWhiteSpace(branding?.PrimaryColor) ? "#1a1a6e" : branding.PrimaryColor,
                },
                BillingAddress = new BillingInfo
                {
                    Name    = customerName,
                    Phone   = customerPhone,
                    Address = shippingAddr,
                },
                ShippingAddress = new ShippingInfo
                {
                    Name    = customerName,
                    Address = shippingAddr,
                },
                Items = items.Select(i => new ReceiptItem
                {
                    Name      = i.ProductName,
                    Quantity  = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    Total     = i.TotalPrice,
                }).ToList(),
                Subtotal      = order.SubTotal,
                Tax           = order.TaxAmount,
                Shipping      = order.ShippingCost,
                Total         = order.TotalAmount,
                PaymentMethod = "—",
                PaymentStatus = "Paid",
            };

            var pdfBytes = await _pdfInvoiceGenerator.GenerateInvoiceAsync(data);

            _logger.LogInformation("Invoice PDF downloaded for order {OrderId}", orderId);
            return File(pdfBytes, "application/pdf", $"Invoice-{order.OrderNumber}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading invoice PDF for order {OrderId}", orderId);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Failed to generate PDF" });
        }
    }

    private static string Fmt(decimal amount) => $"&#8377;{amount:N2}";
    private static string Encode(string? s)   => System.Net.WebUtility.HtmlEncode(s ?? string.Empty);
}
