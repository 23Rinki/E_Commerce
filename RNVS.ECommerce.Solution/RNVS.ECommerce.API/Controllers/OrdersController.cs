using Microsoft.AspNetCore.Authorization;
using RNVS.ECommerce.API.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.DTOs.Order;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Order;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data;
using RNVS.ECommerce.Infrastructure.Email;
using RNVS.ECommerce.Infrastructure.Services;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly ICartRepository _cartRepository;
    private readonly ApplicationDbContext _context;
    private readonly VendorDbContext _vendorContext;
    private readonly StorefrontProductsService _storefront;
    private readonly IEmailService _emailService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(
        ICartRepository cartRepository,
        ApplicationDbContext context,
        VendorDbContext vendorContext,
        StorefrontProductsService storefront,
        IEmailService emailService,
        IServiceScopeFactory scopeFactory,
        ILogger<OrdersController> logger)
    {
        _cartRepository = cartRepository;
        _context = context;
        _vendorContext = vendorContext;
        _storefront = storefront;
        _emailService = emailService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    // Reads this vendor's own Tax/Shipping settings from their own database (PlatformSettings is
    // VendorId-scoped even inside a shared DB), falling back to platform-wide defaults if the
    // vendor never initialized their settings.
    private static async Task<(decimal TaxRate, decimal FreeShippingThreshold, decimal ShippingFlatRate)> GetVendorChargeSettingsAsync(
        VendorDbContext vendorDb, string vendorId)
    {
        var rows = await vendorDb.PlatformSettings
            .Where(s => s.VendorId == vendorId && (s.Key == "TaxRate" || s.Key == "FreeShippingThreshold" || s.Key == "ShippingFlatRate"))
            .ToDictionaryAsync(s => s.Key, s => s.Value);

        decimal taxRate = rows.TryGetValue("TaxRate", out var tr) && decimal.TryParse(tr, out var trv) ? trv : 0.18m;
        decimal freeThreshold = rows.TryGetValue("FreeShippingThreshold", out var ft) && decimal.TryParse(ft, out var ftv) ? ftv : 1000m;
        decimal flatRate = rows.TryGetValue("ShippingFlatRate", out var fr) && decimal.TryParse(fr, out var frv) ? frv : 50m;

        return (taxRate, freeThreshold, flatRate);
    }

    // Orders can live in any vendor's database now, and order IDs are only unique within a
    // single database — so finding "order {id}" means checking the hinted vendor first (cheap),
    // then falling back to scanning every known vendor database (small, fixed set).
    private async Task<(VendorDbContext Db, Order Order)?> FindOrderContextAsync(int id, string? vendorIdHint)
    {
        if (!string.IsNullOrEmpty(vendorIdHint))
        {
            var hintConn = await _storefront.GetVendorConnectionStringAsync(vendorIdHint);
            var db = new VendorDbContext(new DbContextOptionsBuilder<VendorDbContext>().UseNpgsql(hintConn).Options);
            var order = await db.Orders.FindAsync(id);
            if (order != null) return (db, order);
            await db.DisposeAsync();
        }

        foreach (var connStr in await _storefront.GetAllVendorConnectionStringsAsync())
        {
            var db = new VendorDbContext(new DbContextOptionsBuilder<VendorDbContext>().UseNpgsql(connStr).Options);
            var order = await db.Orders.FindAsync(id);
            if (order != null) return (db, order);
            await db.DisposeAsync();
        }

        return null;
    }

    /// <summary>
    /// Create order from cart
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] OrderCreateDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid input",
                    Errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            // Validate shipping address
            var address = await _vendorContext.Addresses
                .FirstOrDefaultAsync(a => a.Id == dto.ShippingAddressId && a.UserId == userId);
            if (address == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Shipping address not found"
                });
            }

            // Validate payment method
            var paymentMethod = await _vendorContext.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == dto.PaymentMethodId && pm.UserId == userId);
            if (paymentMethod == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Payment method not found"
                });
            }

            // Get cart with items
            var cart = await _cartRepository.GetCartWithItemsAsync(userId);
            if (cart == null || cart.CartItems == null || !cart.CartItems.Any())
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Cart is empty"
                });
            }

            // Group cart items by which vendor's database the product actually lives in — products
            // from different vendors can live in entirely separate databases (each vendor may have
            // their own dedicated DB), so a single Order can no longer be written to one connection.
            var groups = cart.CartItems.GroupBy(ci => ci.VendorId ?? string.Empty).ToList();
            if (groups.Any(g => string.IsNullOrEmpty(g.Key)))
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "One or more cart items could not be matched to a vendor. Please remove and re-add them to your cart."
                });
            }

            string sharedOrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString().Substring(0, 4).ToUpper()}";
            var createdOrders = new List<(string VendorId, decimal SubTotal, decimal TaxAmount, decimal ShippingCost, decimal TotalAmount, List<OrderItem> Items)>();

            // Phone isn't stored on Address — pull it from the customer's own account for the snapshot below.
            var customerUser = await _context.Users.FindAsync(userId);

            foreach (var group in groups)
            {
                var vendorId = group.Key;
                await using var vendorDb = await _storefront.OpenVendorDbContextAsync(vendorId);

                // Validate stock for this vendor's items inside their own database
                decimal groupSubTotal = 0m;
                var productsById = new Dictionary<int, Domain.Entities.Product.Product>();
                foreach (var cartItem in group)
                {
                    var product = await vendorDb.Products.FindAsync(cartItem.ProductId);
                    if (product == null)
                    {
                        return BadRequest(new ApiResponseDto<object>
                        {
                            Success = false,
                            Message = $"Product {cartItem.Product?.Name ?? cartItem.ProductId.ToString()} not found"
                        });
                    }
                    if (product.StockQuantity < cartItem.Quantity)
                    {
                        return BadRequest(new ApiResponseDto<object>
                        {
                            Success = false,
                            Message = $"Insufficient stock for {product.Name}. Only {product.StockQuantity} available"
                        });
                    }
                    productsById[cartItem.ProductId] = product;
                    groupSubTotal += cartItem.UnitPrice * cartItem.Quantity;
                }

                // Tax/shipping are configured per vendor (not a fixed platform-wide rate) — read
                // straight from that vendor's own settings, falling back to sane defaults.
                var (taxRate, freeThreshold, flatShipping) = await GetVendorChargeSettingsAsync(vendorDb, vendorId);
                decimal groupTax = groupSubTotal * taxRate;
                decimal groupShipping = (freeThreshold > 0 && groupSubTotal >= freeThreshold) ? 0m : flatShipping;
                decimal groupTotal = groupSubTotal + groupTax + groupShipping;

                var order = new Order
                {
                    OrderNumber = sharedOrderNumber,
                    UserId = userId,
                    VendorId = vendorId,
                    SubTotal = groupSubTotal,
                    TaxAmount = groupTax,
                    ShippingCost = groupShipping,
                    TotalAmount = groupTotal,
                    Status = OrderStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    CustomerGSTIN = string.IsNullOrWhiteSpace(dto.CustomerGSTIN) ? null : dto.CustomerGSTIN.Trim().ToUpper(),
                    // Frozen shipping snapshot — captured now so later address-book edits never alter past orders
                    ShippingName = $"{address.FirstName} {address.LastName}".Trim(),
                    ShippingPhone = customerUser?.PhoneNumber,
                    ShippingStreet = address.Street,
                    ShippingCity = address.City,
                    ShippingState = address.State,
                    ShippingPostalCode = address.PostalCode,
                    ShippingCountry = address.Country,
                };
                vendorDb.Orders.Add(order);
                await vendorDb.SaveChangesAsync(); // need order.Id before creating items/history/payment

                var groupItems = new List<OrderItem>();
                foreach (var cartItem in group)
                {
                    var product = productsById[cartItem.ProductId];
                    groupItems.Add(new OrderItem
                    {
                        OrderId = order.Id,
                        ProductId = cartItem.ProductId,
                        VendorId = vendorId,
                        ProductName = cartItem.Product?.Name ?? product.Name,
                        Quantity = cartItem.Quantity,
                        UnitPrice = cartItem.UnitPrice,
                        TotalPrice = cartItem.UnitPrice * cartItem.Quantity
                    });
                    product.StockQuantity -= cartItem.Quantity;
                }
                await vendorDb.OrderItems.AddRangeAsync(groupItems);

                await vendorDb.OrderStatusHistories.AddAsync(new OrderStatusHistory
                {
                    OrderId = order.Id,
                    PreviousStatus = OrderStatus.Pending,
                    NewStatus = OrderStatus.Pending,
                    UpdatedBy = userId,
                    Comment = "Order placed successfully",
                    CreatedAt = DateTime.UtcNow
                });

                await vendorDb.Payments.AddAsync(new Domain.Entities.Payment.Payment
                {
                    OrderId = order.Id,
                    VendorId = vendorId,
                    Amount = groupTotal,
                    Method = paymentMethod.Type == "Card" ? Domain.Enums.PaymentMethod.CreditCard :
                             paymentMethod.Type == "PayPal" ? Domain.Enums.PaymentMethod.PayPal :
                             paymentMethod.Type == "BankTransfer" ? Domain.Enums.PaymentMethod.BankTransfer :
                             Domain.Enums.PaymentMethod.CashOnDelivery,
                    Status = Domain.Enums.PaymentStatus.Pending,
                    TransactionId = $"TXN-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString().Substring(0, 6).ToUpper()}",
                    CreatedAt = DateTime.UtcNow
                });

                await vendorDb.SaveChangesAsync();

                createdOrders.Add((vendorId, groupSubTotal, groupTax, groupShipping, groupTotal, groupItems));
            }

            // Clear cart (lives in the customer's own resolved database, separate from any vendor's)
            cart.CartItems.Clear();
            await _cartRepository.UpdateAsync(cart);

            _logger.LogInformation("Order {OrderNumber} created across {VendorCount} vendor database(s) for user {UserId}",
                sharedOrderNumber, createdOrders.Count, userId);

            // Capture payment info for email closure
            var capturedPaymentType = paymentMethod.Type;
            var capturedOrderNumber = sharedOrderNumber;

            // Send one combined confirmation email (fire-and-forget — don't fail the order if email fails).
            // Must resolve a FRESH ApplicationDbContext from a new DI scope here — the controller's own
            // _context is request-scoped and gets disposed as soon as this HTTP response is sent, which
            // was silently crashing every confirmation email with ObjectDisposedException (found Aug 2026).
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var scopedContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var customer = await scopedContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                    if (customer != null && !string.IsNullOrEmpty(customer.Email))
                    {
                        var allItems = createdOrders.SelectMany(o => o.Items).ToList();
                        decimal grandSubTotal = createdOrders.Sum(o => o.SubTotal);
                        decimal grandTax = createdOrders.Sum(o => o.TaxAmount);
                        decimal grandShipping = createdOrders.Sum(o => o.ShippingCost);
                        decimal grandTotal = createdOrders.Sum(o => o.TotalAmount);

                        var isCod = capturedPaymentType == "CashOnDelivery";
                        var paymentLabel = isCod ? "Cash on Delivery" :
                                           capturedPaymentType == "PayPal" ? "PayPal" : "Card / Online";
                        var paymentStatusColor = isCod ? "#d97706" : "#16a34a";
                        var paymentStatusBg    = isCod ? "#fef3c7" : "#dcfce7";
                        var paymentStatusText  = isCod
                            ? "You will pay when your order is delivered."
                            : "&#10003; Payment received. Your order is confirmed.";

                        var itemRows = string.Join("", allItems.Select(oi =>
                            $"<tr><td style='padding:8px 12px;border-bottom:1px solid #eee'>{oi.ProductName}</td>" +
                            $"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:center'>{oi.Quantity}</td>" +
                            $"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:right'>&#8377;{oi.UnitPrice:N2}</td>" +
                            $"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:right'>&#8377;{oi.TotalPrice:N2}</td></tr>"));

                        var customerName = $"{customer.FirstName} {customer.LastName}".Trim();
                        if (string.IsNullOrWhiteSpace(customerName)) customerName = customer.Email;

                        var emailBody = $@"
<!DOCTYPE html><html><head><meta charset='utf-8'></head><body style='margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif'>
<div style='max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)'>
  <div style='background:#1e293b;padding:32px 40px;text-align:center'>
    <h1 style='margin:0;color:#fff;font-size:22px;font-weight:700'>RNVS CommerceX</h1>
    <p style='margin:8px 0 0;color:#94a3b8;font-size:14px'>Order Confirmation</p>
  </div>
  <div style='padding:32px 40px'>
    <p style='color:#334155;font-size:15px'>Hi {customerName},</p>
    <p style='color:#334155;font-size:15px'>Thank you for your order! We've received it and it's now being processed.</p>
    <div style='background:#f8fafc;border-radius:8px;padding:16px 20px;margin:20px 0;display:flex;justify-content:space-between;align-items:center'>
      <div>
        <p style='margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px'>Order Number</p>
        <p style='margin:0;color:#1e293b;font-size:18px;font-weight:700'>{capturedOrderNumber}</p>
      </div>
      <div style='text-align:right'>
        <p style='margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px'>Date</p>
        <p style='margin:0;color:#1e293b;font-size:14px;font-weight:600'>{DateTime.UtcNow:dd MMM yyyy}</p>
      </div>
    </div>
    <div style='background:{paymentStatusBg};border-radius:8px;padding:14px 18px;margin:0 0 20px;border-left:4px solid {paymentStatusColor}'>
      <p style='margin:0 0 4px;color:{paymentStatusColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px'>Payment — {paymentLabel}</p>
      <p style='margin:0;color:{paymentStatusColor};font-size:13px'>{paymentStatusText}</p>
    </div>
    <table style='width:100%;border-collapse:collapse;margin:20px 0'>
      <thead>
        <tr style='background:#f1f5f9'>
          <th style='padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase'>Item</th>
          <th style='padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase'>Qty</th>
          <th style='padding:10px 12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase'>Price</th>
          <th style='padding:10px 12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase'>Total</th>
        </tr>
      </thead>
      <tbody>{itemRows}</tbody>
    </table>
    <div style='text-align:right;border-top:2px solid #e2e8f0;padding-top:12px'>
      <p style='margin:4px 0;color:#64748b;font-size:13px'>Subtotal: <strong>&#8377;{grandSubTotal:N2}</strong></p>
      <p style='margin:4px 0;color:#64748b;font-size:13px'>Tax: <strong>&#8377;{grandTax:N2}</strong></p>
      <p style='margin:4px 0;color:#64748b;font-size:13px'>Shipping: <strong>{(grandShipping == 0 ? "FREE" : $"&#8377;{grandShipping:N2}")}</strong></p>
      <p style='margin:8px 0 0;color:#1e293b;font-size:17px;font-weight:700'>Grand Total: &#8377;{grandTotal:N2}</p>
    </div>
    <div style='text-align:center;margin-top:28px'>
      <a href='http://localhost:3000/account/orders' style='display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px'>Track My Order</a>
    </div>
  </div>
  <div style='background:#f8fafc;padding:20px 40px;text-align:center;font-size:12px;color:#94a3b8'>
    &copy; {DateTime.UtcNow.Year} RNVS CommerceX. Thank you for shopping with us!
  </div>
</div>
</body></html>";

                        await _emailService.SendEmailAsync(customer.Email, $"Order Confirmed — {capturedOrderNumber}", emailBody);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send order confirmation email for order {OrderNumber}", capturedOrderNumber);
                }
            });

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Order created successfully",
                Data = new { OrderNumber = sharedOrderNumber, VendorCount = createdOrders.Count }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating order");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get all orders for the logged-in vendor
    /// </summary>
    [RequireAccess("orders")]
    [HttpGet("vendor-orders")]
    public async Task<IActionResult> GetVendorOrders()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new ApiResponseDto<object> { Success = false, Message = "User not authenticated" });

            // Filter by OrderItems.VendorId, not Order.VendorId — when this vendor shares a database
            // with another vendor (no dedicated DB), the same physical Orders table holds both
            // vendors' sub-orders, and Order.VendorId alone can't tell them apart per item.
            var orderIds = await _vendorContext.OrderItems
                .Where(oi => oi.VendorId == userId)
                .Select(oi => oi.OrderId)
                .Distinct()
                .ToListAsync();

            var orders = await _vendorContext.Orders
                .Where(o => orderIds.Contains(o.Id))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            var result = new List<OrderDto>();
            foreach (var order in orders)
            {
                var items = await _vendorContext.OrderItems
                    .Where(oi => oi.OrderId == order.Id && oi.VendorId == userId)
                    .ToListAsync();

                var customer = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.UserId);

                result.Add(new OrderDto
                {
                    Id = order.Id,
                    OrderNumber = order.OrderNumber,
                    UserId = order.UserId,
                    CustomerName = customer == null ? null : $"{customer.FirstName} {customer.LastName}".Trim(),
                    CustomerEmail = customer?.Email,
                    CustomerPhone = customer?.PhoneNumber,
                    VendorId = userId,
                    SubTotal = items.Sum(oi => oi.TotalPrice),
                    TaxAmount = order.TaxAmount,
                    ShippingCost = order.ShippingCost,
                    TotalAmount = order.TotalAmount,
                    Status = (int)order.Status,
                    CreatedAt = order.CreatedAt,
                    Items = items.Select(oi => new OrderItemDto
                    {
                        Id = oi.Id,
                        ProductId = oi.ProductId,
                        ProductName = oi.ProductName,
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        TotalPrice = oi.TotalPrice
                    }).ToList(),
                    ShippingName = order.ShippingName,
                    ShippingPhone = order.ShippingPhone,
                    ShippingStreet = order.ShippingStreet,
                    ShippingCity = order.ShippingCity,
                    ShippingState = order.ShippingState,
                    ShippingPostalCode = order.ShippingPostalCode,
                    ShippingCountry = order.ShippingCountry,
                });
            }

            return Ok(new ApiResponseDto<List<OrderDto>> { Success = true, Data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting vendor orders");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get all orders for current user
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            // A customer's orders can be split across several vendor databases — scan every
            // known database for this user's orders, the same way the storefront aggregates
            // product listings across vendors.
            var orderDtos = new List<OrderDto>();
            var connStrings = await _storefront.GetAllVendorConnectionStringsAsync();
            foreach (var connStr in connStrings)
            {
                await using var db = new VendorDbContext(new DbContextOptionsBuilder<VendorDbContext>().UseNpgsql(connStr).Options);
                var orders = await db.Orders.Where(o => o.UserId == userId).ToListAsync();
                foreach (var order in orders)
                {
                    var orderItems = await db.OrderItems
                        .Where(oi => oi.OrderId == order.Id)
                        .ToListAsync();

                    var productIds = orderItems.Select(oi => oi.ProductId).ToList();
                    var allImages = await db.ProductImages
                        .Where(pi => productIds.Contains(pi.ProductId))
                        .OrderBy(pi => pi.DisplayOrder)
                        .ToListAsync();
                    var imageMap = allImages
                        .GroupBy(pi => pi.ProductId)
                        .ToDictionary(g => g.Key, g => g.First().ImagePath);

                    orderDtos.Add(new OrderDto
                    {
                        Id = order.Id,
                        OrderNumber = order.OrderNumber,
                        UserId = order.UserId,
                        VendorId = order.VendorId,
                        SubTotal = order.SubTotal,
                        TaxAmount = order.TaxAmount,
                        ShippingCost = order.ShippingCost,
                        TotalAmount = order.TotalAmount,
                        Status = (int)order.Status,
                        CreatedAt = order.CreatedAt,
                        Items = orderItems.Select(oi => new OrderItemDto
                        {
                            Id = oi.Id,
                            ProductId = oi.ProductId,
                            ProductName = oi.ProductName,
                            Quantity = oi.Quantity,
                            UnitPrice = oi.UnitPrice,
                            TotalPrice = oi.TotalPrice,
                            ProductImageUrl = imageMap.TryGetValue(oi.ProductId, out var img) ? img : null
                        }).ToList()
                    });
                }
            }

            return Ok(new ApiResponseDto<List<OrderDto>>
            {
                Success = true,
                Data = orderDtos.OrderByDescending(o => o.CreatedAt).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting orders");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get order by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderById(int id, [FromQuery] string? v = null)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var found = await FindOrderContextAsync(id, v);
            if (found == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Order not found"
                });
            }
            await using var db = found.Value.Db;
            var order = found.Value.Order;

            // Check if user owns this order (or is admin)
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            if (order.UserId != userId && userRole != "Admin" && userRole != "SuperAdmin")
            {
                return Forbid();
            }

            var orderItems = await db.OrderItems
                .Where(oi => oi.OrderId == order.Id)
                .ToListAsync();
            var customer = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.UserId);

            var orderDto = new OrderDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                UserId = order.UserId,
                CustomerEmail = customer?.Email,
                CustomerPhone = customer?.PhoneNumber,
                VendorId = order.VendorId,
                SubTotal = order.SubTotal,
                TaxAmount = order.TaxAmount,
                ShippingCost = order.ShippingCost,
                TotalAmount = order.TotalAmount,
                Status = (int)order.Status,
                CreatedAt = order.CreatedAt,
                Items = orderItems.Select(oi => new OrderItemDto
                {
                    Id = oi.Id,
                    ProductId = oi.ProductId,
                    ProductName = oi.ProductName,
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice,
                    TotalPrice = oi.TotalPrice
                }).ToList()
            };

            return Ok(new ApiResponseDto<OrderDto>
            {
                Success = true,
                Data = orderDto
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting order {OrderId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Update order status — vendors can update their own orders; admins can update any
    /// </summary>
    [RequireAccess("orders")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto, [FromQuery] string? v = null)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid input",
                    Errors = ModelState.Values
                        .SelectMany(err => err.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);

            var found = await FindOrderContextAsync(id, v);
            if (found == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Order not found"
                });
            }
            await using var db = found.Value.Db;
            var order = found.Value.Order;

            // Vendor can only update orders they have at least one item in — check OrderItems, not
            // Order.VendorId, since a shared-DB order can contain items from multiple vendors
            // (same reasoning as GetVendorOrders above).
            bool isAdmin = userRole == "Admin" || userRole == "SuperAdmin";
            if (!isAdmin)
            {
                var ownsItem = await db.OrderItems.AnyAsync(oi => oi.OrderId == order.Id && oi.VendorId == userId);
                if (!ownsItem)
                {
                    return Forbid();
                }
            }

            // Validate status
            if (!Enum.IsDefined(typeof(OrderStatus), dto.Status))
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid order status"
                });
            }

            var previousStatus = order.Status;
            var newStatus = (OrderStatus)dto.Status;

            order.Status = newStatus;

            var statusHistory = new OrderStatusHistory
            {
                OrderId = order.Id,
                PreviousStatus = previousStatus,
                NewStatus = newStatus,
                UpdatedBy = userId,
                Comment = dto.Comment ?? $"Status updated to {newStatus}",
                CreatedAt = DateTime.UtcNow
            };
            await db.OrderStatusHistories.AddAsync(statusHistory);
            await db.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} status updated from {PreviousStatus} to {NewStatus} by {UserId}",
                id, previousStatus, newStatus, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Order status updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating order status for order {OrderId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get order tracking/status history
    /// </summary>
    [HttpGet("{id}/tracking")]
    public async Task<IActionResult> GetOrderTracking(int id, [FromQuery] string? v = null)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var found = await FindOrderContextAsync(id, v);
            if (found == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Order not found"
                });
            }
            await using var db = found.Value.Db;
            var order = found.Value.Order;

            // Check if user owns this order (or is admin)
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            if (order.UserId != userId && userRole != "Admin" && userRole != "SuperAdmin")
            {
                return Forbid();
            }

            var statusHistories = await db.OrderStatusHistories
                .Where(osh => osh.OrderId == id)
                .OrderBy(osh => osh.CreatedAt)
                .ToListAsync();

            var trackingData = statusHistories.Select(sh => new
            {
                PreviousStatus = sh.PreviousStatus.ToString(),
                NewStatus = sh.NewStatus.ToString(),
                UpdatedBy = sh.UpdatedBy,
                Comment = sh.Comment,
                CreatedAt = sh.CreatedAt
            }).ToList();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    OrderNumber = order.OrderNumber,
                    CurrentStatus = order.Status.ToString(),
                    StatusHistory = trackingData
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting order tracking for order {OrderId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Cancel order
    /// </summary>
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(int id, [FromQuery] string? v = null)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var found = await FindOrderContextAsync(id, v);
            if (found == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Order not found"
                });
            }
            await using var db = found.Value.Db;
            var order = found.Value.Order;

            // Check if user owns this order
            if (order.UserId != userId)
            {
                return Forbid();
            }

            // Can only cancel pending or processing orders
            if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Processing)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = $"Cannot cancel order with status {order.Status}"
                });
            }

            var previousStatus = order.Status;
            order.Status = OrderStatus.Cancelled;

            // Restore product stock — in the same database the order's items live in
            var orderItems = await db.OrderItems.Where(oi => oi.OrderId == id).ToListAsync();
            foreach (var orderItem in orderItems)
            {
                var product = await db.Products.FindAsync(orderItem.ProductId);
                if (product != null)
                {
                    product.StockQuantity += orderItem.Quantity;
                }
            }

            // Add status history
            var statusHistory = new OrderStatusHistory
            {
                OrderId = order.Id,
                PreviousStatus = previousStatus,
                NewStatus = OrderStatus.Cancelled,
                UpdatedBy = userId,
                Comment = "Order cancelled by customer",
                CreatedAt = DateTime.UtcNow
            };
            await db.OrderStatusHistories.AddAsync(statusHistory);
            await db.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} cancelled by user {UserId}", id, userId);

            // Notify every vendor who had items in this order — fire-and-forget, don't fail the
            // cancellation itself if the email fails (same pattern as the order confirmation email).
            var capturedOrderNumber = order.OrderNumber;
            var capturedOrderId = order.Id;
            var vendorIds = orderItems.Select(oi => oi.VendorId).Where(v => !string.IsNullOrEmpty(v)).Distinct().ToList();
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var scopedContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var customer = await scopedContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                    var customerName = customer == null ? "A customer" : $"{customer.FirstName} {customer.LastName}".Trim();
                    if (string.IsNullOrWhiteSpace(customerName)) customerName = customer?.Email ?? "A customer";

                    foreach (var vendorId in vendorIds)
                    {
                        var vendor = await scopedContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == vendorId);
                        if (vendor == null || string.IsNullOrEmpty(vendor.Email)) continue;

                        var vendorItemRows = string.Join("", orderItems.Where(oi => oi.VendorId == vendorId).Select(oi =>
                            $"<tr><td style='padding:8px 12px;border-bottom:1px solid #eee'>{oi.ProductName}</td>" +
                            $"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:center'>{oi.Quantity}</td>" +
                            $"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:right'>&#8377;{oi.TotalPrice:N2}</td></tr>"));

                        var emailBody = $@"
<!DOCTYPE html><html><head><meta charset='utf-8'></head><body style='margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif'>
<div style='max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)'>
  <div style='background:#b91c1c;padding:32px 40px;text-align:center'>
    <h1 style='margin:0;color:#fff;font-size:22px;font-weight:700'>Order Cancelled</h1>
    <p style='margin:8px 0 0;color:#fecaca;font-size:14px'>{capturedOrderNumber}</p>
  </div>
  <div style='padding:32px 40px'>
    <p style='color:#334155;font-size:15px'>Hi {vendor.FirstName},</p>
    <p style='color:#334155;font-size:15px'>{customerName} has cancelled order <strong>{capturedOrderNumber}</strong>. It has already been marked as cancelled and the stock has been restored automatically — no action is needed from you.</p>
    <table style='width:100%;border-collapse:collapse;margin:20px 0'>
      <thead>
        <tr style='background:#f1f5f9'>
          <th style='padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase'>Item</th>
          <th style='padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase'>Qty</th>
          <th style='padding:10px 12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase'>Total</th>
        </tr>
      </thead>
      <tbody>{vendorItemRows}</tbody>
    </table>
    <div style='text-align:center;margin-top:28px'>
      <a href='http://localhost:3000/vendor/orders' style='display:inline-block;background:#1e293b;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px'>View Orders</a>
    </div>
  </div>
  <div style='background:#f8fafc;padding:20px 40px;text-align:center;font-size:12px;color:#94a3b8'>
    &copy; {DateTime.UtcNow.Year} RNVS CommerceX.
  </div>
</div>
</body></html>";

                        await _emailService.SendEmailAsync(vendor.Email, $"Order Cancelled — {capturedOrderNumber}", emailBody);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send cancellation email for order {OrderId}", capturedOrderId);
                }
            });

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Order cancelled successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling order {OrderId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }
}
