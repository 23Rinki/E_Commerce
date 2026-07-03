using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Application.Interfaces.Services;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Domain.Entities.Platform;
using RNVS.ECommerce.Domain.Entities.Vendor;
using RNVS.ECommerce.Infrastructure.Data;
using Npgsql;

namespace RNVS.ECommerce.API.Controllers;

/// <summary>
/// Platform owner (SuperAdmin) endpoints for monitoring all vendors.
/// Use this to quickly understand any vendor's setup when they request support.
/// </summary>
[ApiController]
[Route("api/platform")]
[Authorize(Roles = "SuperAdmin,Admin")]
public class PlatformAdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IVendorDatabaseProvisioningService _dbProvisioning;
    private readonly ILogger<PlatformAdminController> _logger;
    private readonly IConfiguration _config;

    public PlatformAdminController(
        ApplicationDbContext db,
        IVendorDatabaseProvisioningService dbProvisioning,
        ILogger<PlatformAdminController> logger,
        IConfiguration config)
    {
        _db = db;
        _dbProvisioning = dbProvisioning;
        _logger = logger;
        _config = config;
    }

    // GET api/platform/tenants
    [HttpGet("tenants")]
    public async Task<IActionResult> GetAllTenants(
        [FromQuery] TenantStatus? status = null,
        [FromQuery] PlanTier? plan = null,
        [FromQuery] string? search = null)
    {
        try
        {
            var query = _db.TenantRegistrations.AsNoTracking();

            if (status.HasValue) query = query.Where(t => t.Status == status.Value);
            if (plan.HasValue) query = query.Where(t => t.Plan == plan.Value);
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(t =>
                    t.StoreName.Contains(search) ||
                    t.ContactEmail.Contains(search));

            var rawTenants = await query
                .OrderByDescending(t => t.LastActivityAt ?? t.CreatedAt)
                .ToListAsync();

            // Batch-load vendor names from Users table
            var vendorIds = rawTenants.Select(t => t.VendorId).Where(v => v != null).Distinct().ToList();
            var vendorNames = await _db.Users
                .Where(u => vendorIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FirstName, u.LastName })
                .ToDictionaryAsync(u => u.Id);

            var tenants = rawTenants.Select(t =>
            {
                vendorNames.TryGetValue(t.VendorId, out var vendor);
                return new TenantSummaryDto
                {
                    Id = t.Id,
                    VendorId = t.VendorId,
                    VendorName = vendor != null ? $"{vendor.FirstName} {vendor.LastName}".Trim() : null,
                    StoreName = t.StoreName,
                    ContactEmail = t.ContactEmail,
                    ContactPhone = t.ContactPhone,
                    Plan = t.Plan.ToString(),
                    Status = t.Status.ToString(),
                    HasDedicatedDb = t.RailwayDatabaseUrl != null,
                    ServiceId = t.RailwayServiceId,
                    SubscriptionStartDate = t.SubscriptionStartDate,
                    SubscriptionEndDate = t.SubscriptionEndDate,
                    LastActivityAt = t.LastActivityAt,
                    DaysSinceLastActivity = t.LastActivityAt.HasValue
                        ? (int)(DateTime.UtcNow - t.LastActivityAt.Value).TotalDays
                        : (int?)(DateTime.UtcNow - t.CreatedAt).TotalDays,
                    HasMaintenanceNotes = !string.IsNullOrEmpty(t.MaintenanceNotes),
                    CreatedAt = t.CreatedAt
                };
            }).ToList();

            return Ok(new ApiResponseDto<List<TenantSummaryDto>>
            {
                Success = true,
                Data = tenants
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tenant list");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // GET api/platform/tenants/{id}
    [HttpGet("tenants/{id}")]
    public async Task<IActionResult> GetTenant(int id)
    {
        try
        {
            var t = await _db.TenantRegistrations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (t == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Tenant not found" });

            return Ok(new ApiResponseDto<TenantDetailDto>
            {
                Success = true,
                Data = new TenantDetailDto
                {
                    Id = t.Id,
                    VendorId = t.VendorId,
                    StoreName = t.StoreName,
                    ContactEmail = t.ContactEmail,
                    ContactPhone = t.ContactPhone,
                    Plan = t.Plan.ToString(),
                    Status = t.Status.ToString(),
                    RailwayDatabaseUrl = t.RailwayDatabaseUrl,
                    ServiceId = t.RailwayServiceId,
                    StoragePrefix = t.StoragePrefix,
                    SubscriptionStartDate = t.SubscriptionStartDate,
                    SubscriptionEndDate = t.SubscriptionEndDate,
                    LastActivityAt = t.LastActivityAt,
                    MaintenanceNotes = t.MaintenanceNotes,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tenant {TenantId}", id);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // POST api/platform/tenants — onboard a new vendor manually
    [HttpPost("tenants")]
    public async Task<IActionResult> CreateTenant([FromBody] CreateTenantDto dto)
    {
        try
        {
            var tenant = new TenantRegistration
            {
                VendorId = dto.VendorId,
                StoreName = dto.StoreName,
                ContactEmail = dto.ContactEmail,
                ContactPhone = dto.ContactPhone,
                Plan = Enum.Parse<PlanTier>(dto.Plan),
                Status = TenantStatus.Trial,
                StoragePrefix = $"vendor-{dto.VendorId}/",
                SubscriptionStartDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.TenantRegistrations.Add(tenant);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Tenant created: {TenantId} ({StoreName})", tenant.Id, tenant.StoreName);

            return Ok(new ApiResponseDto<object> { Success = true, Data = new { id = tenant.Id }, Message = "Tenant created" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tenant");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // PATCH api/platform/tenants/{id}/status
    [HttpPatch("tenants/{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTenantStatusDto dto)
    {
        try
        {
            var tenant = await _db.TenantRegistrations.FindAsync(id);
            if (tenant == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Tenant not found" });

            tenant.Status = Enum.Parse<TenantStatus>(dto.Status);
            tenant.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Tenant {TenantId} status → {Status}", id, dto.Status);

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Status updated" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating tenant status");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // PUT api/platform/tenants/{id}/notes — add/update maintenance notes
    [HttpPut("tenants/{id}/notes")]
    public async Task<IActionResult> UpdateNotes(int id, [FromBody] UpdateNotesDto dto)
    {
        try
        {
            var tenant = await _db.TenantRegistrations.FindAsync(id);
            if (tenant == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Tenant not found" });

            // Prepend new note with timestamp so history is preserved
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
            var newEntry = $"[{timestamp}] {dto.Note}";
            tenant.MaintenanceNotes = string.IsNullOrEmpty(tenant.MaintenanceNotes)
                ? newEntry
                : $"{newEntry}\n\n{tenant.MaintenanceNotes}";

            tenant.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Note saved" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notes for tenant {TenantId}", id);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // PUT api/platform/tenants/{id}/database — save vendor DB URL and auto-run migrations
    [HttpPut("tenants/{id}/database")]
    public async Task<IActionResult> UpdateDatabaseInfo(int id, [FromBody] UpdateRailwayDto dto)
    {
        try
        {
            var tenant = await _db.TenantRegistrations.FindAsync(id);
            if (tenant == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Tenant not found" });

            // Test connection before saving
            try
            {
                var testOpts = new DbContextOptionsBuilder<VendorDbContext>()
                    .UseNpgsql(dto.DatabaseUrl)
                    .Options;
                using var testDb = new VendorDbContext(testOpts);
                await testDb.Database.CanConnectAsync();
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = $"Cannot connect to database: {ex.Message}"
                });
            }

            // Run EF Core migrations on the vendor's new database
            try
            {
                var vendorOpts = new DbContextOptionsBuilder<VendorDbContext>()
                    .UseNpgsql(dto.DatabaseUrl)
                    .Options;
                using var vendorDb = new VendorDbContext(vendorOpts);
                await vendorDb.Database.MigrateAsync();
                _logger.LogInformation("Migrations applied to vendor {TenantId} database", id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Migration failed for tenant {TenantId}", id);
                return StatusCode(500, new ApiResponseDto<object>
                {
                    Success = false,
                    Message = $"Database connected but migration failed: {ex.Message}"
                });
            }

            // Save URL only after successful migration
            tenant.RailwayDatabaseUrl = dto.DatabaseUrl;
            tenant.RailwayServiceId = dto.ServiceId;
            tenant.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Dedicated DB configured for tenant {TenantId}", id);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Database configured and migrations applied successfully."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating database info for tenant {TenantId}", id);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // ── Cross-tenant queries — SuperAdmin reads any vendor's own DB ──────────

    // Helper: open a VendorDbContext pointed at a specific tenant's DB
    private async Task<(VendorDbContext? db, IActionResult? error)> OpenVendorDb(int tenantId)
    {
        var tenant = await _db.TenantRegistrations.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant == null)
            return (null, NotFound(new ApiResponseDto<object> { Success = false, Message = "Tenant not found" }));

        if (string.IsNullOrEmpty(tenant.RailwayDatabaseUrl))
            return (null, BadRequest(new ApiResponseDto<object> { Success = false, Message = "Vendor database not yet provisioned." }));

        var connStr = tenant.RailwayDatabaseUrl;

        var opts = new DbContextOptionsBuilder<VendorDbContext>()
            .UseNpgsql(connStr)
            .Options;

        return (new VendorDbContext(opts), null);
    }

    // DELETE api/platform/tenants/{id} — remove vendor registration + user account
    [HttpDelete("tenants/{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteTenant(int id)
    {
        try
        {
            var tenant = await _db.TenantRegistrations.FindAsync(id);
            if (tenant == null)
                return NotFound(new ApiResponseDto<object> { Success = false, Message = "Tenant not found" });

            var vendorId = tenant.VendorId;

            // Fetch user before deletion so we can archive their info
            var user = await _db.Users.FindAsync(vendorId);

            // Save an audit record before deleting
            _db.RemovedVendorRecords.Add(new RemovedVendorRecord
            {
                StoreName    = tenant.StoreName,
                VendorName   = user != null ? $"{user.FirstName} {user.LastName}".Trim() : "Unknown",
                ContactEmail = tenant.ContactEmail,
                ContactPhone = tenant.ContactPhone,
                Plan         = tenant.Plan.ToString(),
                Status       = tenant.Status.ToString(),
                JoinedAt     = tenant.CreatedAt,
                RemovedAt    = DateTime.UtcNow,
            });

            // Remove tenant registration
            _db.TenantRegistrations.Remove(tenant);

            // Remove bank account if exists
            var bankAccount = await _db.VendorBankAccounts.FirstOrDefaultAsync(b => b.VendorId == vendorId);
            if (bankAccount != null) _db.VendorBankAccounts.Remove(bankAccount);

            // Remove the vendor user account
            if (user != null) _db.Users.Remove(user);

            await _db.SaveChangesAsync();

            _logger.LogInformation("Vendor {VendorId} (tenant {TenantId}) removed by admin", vendorId, id);

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Vendor removed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting tenant {TenantId}", id);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // GET api/platform/removed-vendors
    [HttpGet("removed-vendors")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> GetRemovedVendors()
    {
        try
        {
            var records = await _db.RemovedVendorRecords
                .AsNoTracking()
                .OrderByDescending(r => r.RemovedAt)
                .Select(r => new
                {
                    r.Id,
                    r.StoreName,
                    r.VendorName,
                    r.ContactEmail,
                    r.ContactPhone,
                    r.Plan,
                    r.Status,
                    r.JoinedAt,
                    r.RemovedAt,
                })
                .ToListAsync();

            return Ok(new ApiResponseDto<object> { Success = true, Data = records });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching removed vendors");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // GET api/platform/tenants/{id}/overview
    [HttpGet("tenants/{id}/overview")]
    public async Task<IActionResult> GetTenantOverview(int id)
    {
        try
        {
            var (db, err) = await OpenVendorDb(id);
            if (err != null) return err;
            using var vendorDb = db!;

            var now = DateTime.UtcNow;
            var thirtyDaysAgo = now.AddDays(-30);

            var totalOrders   = await vendorDb.Orders.CountAsync();
            var recentOrders  = await vendorDb.Orders.CountAsync(o => o.CreatedAt >= thirtyDaysAgo);
            var totalRevenue  = await vendorDb.Orders
                .Where(o => o.Status != RNVS.ECommerce.Domain.Enums.OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var recentRevenue = await vendorDb.Orders
                .Where(o => o.CreatedAt >= thirtyDaysAgo && o.Status != RNVS.ECommerce.Domain.Enums.OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var totalProducts = await vendorDb.Products.CountAsync();
            var activeProducts = await vendorDb.Products.CountAsync(p => p.IsActive);
            var totalCustomers = await vendorDb.Orders.Select(o => o.UserId).Distinct().CountAsync();
            var pendingOrders = await vendorDb.Orders
                .CountAsync(o => o.Status == RNVS.ECommerce.Domain.Enums.OrderStatus.Pending
                              || o.Status == RNVS.ECommerce.Domain.Enums.OrderStatus.Processing);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    TotalOrders   = totalOrders,
                    RecentOrders  = recentOrders,
                    TotalRevenue  = totalRevenue,
                    RecentRevenue = recentRevenue,
                    TotalProducts = totalProducts,
                    ActiveProducts = activeProducts,
                    TotalCustomers = totalCustomers,
                    PendingOrders  = pendingOrders
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching overview for tenant {TenantId}", id);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // GET api/platform/tenants/{id}/orders?page=1&pageSize=20
    [HttpGet("tenants/{id}/orders")]
    public async Task<IActionResult> GetTenantOrders(int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var (db, err) = await OpenVendorDb(id);
            if (err != null) return err;
            using var vendorDb = db!;

            var query = vendorDb.Orders.AsNoTracking().OrderByDescending(o => o.CreatedAt);
            var total = await query.CountAsync();

            var rawOrders = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.UserId,
                    o.TotalAmount,
                    o.Status,
                    StatusName = o.Status.ToString(),
                    o.CreatedAt,
                    Items = vendorDb.OrderItems
                        .Where(i => i.OrderId == o.Id)
                        .Select(i => new
                        {
                            i.ProductName,
                            i.Quantity,
                            i.UnitPrice,
                            i.TotalPrice,
                        }).ToList()
                })
                .ToListAsync();

            // Look up customer names from main DB
            var userIds = rawOrders.Select(o => o.UserId).Where(u => u != null).Distinct().ToList();
            var customers = await _db.Users
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FirstName, u.LastName, u.Email })
                .ToDictionaryAsync(u => u.Id);

            var orders = rawOrders.Select(o =>
            {
                customers.TryGetValue(o.UserId ?? "", out var cust);
                return new
                {
                    o.Id,
                    o.OrderNumber,
                    o.UserId,
                    CustomerName  = cust != null ? $"{cust.FirstName} {cust.LastName}".Trim() : "Guest",
                    CustomerEmail = cust?.Email ?? "—",
                    o.TotalAmount,
                    o.Status,
                    o.StatusName,
                    o.CreatedAt,
                    o.Items
                };
            }).ToList();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new { Items = orders, TotalCount = total, Page = page, PageSize = pageSize }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching orders for tenant {TenantId}", id);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // GET api/platform/tenants/{id}/products?page=1&pageSize=20
    [HttpGet("tenants/{id}/products")]
    public async Task<IActionResult> GetTenantProducts(int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var (db, err) = await OpenVendorDb(id);
            if (err != null) return err;
            using var vendorDb = db!;

            var query = vendorDb.Products.AsNoTracking().OrderByDescending(p => p.CreatedAt);
            var total = await query.CountAsync();
            var products = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Price,
                    p.IsActive,
                    p.StockQuantity,
                    p.CreatedAt,
                    ImageUrl = vendorDb.ProductImages
                        .Where(i => i.ProductId == p.Id)
                        .OrderBy(i => i.DisplayOrder)
                        .Select(i => i.ImagePath)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new { Items = products, TotalCount = total, Page = page, PageSize = pageSize }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching products for tenant {TenantId}", id);
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // GET api/platform/stats — quick overview for the platform owner's home screen
    /// <summary>
    /// Provision a dedicated PostgreSQL database for an existing vendor.
    /// Creates the database, runs all VendorDbContext migrations, and stores the
    /// connection string in TenantRegistration.RailwayDatabaseUrl.
    /// Safe to call multiple times — MigrateAsync is idempotent.
    /// POST /api/platform/tenants/{vendorId}/provision-db
    /// </summary>
    [HttpPost("tenants/{vendorId}/provision-db")]
    public async Task<IActionResult> ProvisionVendorDatabase(string vendorId)
    {
        try
        {
            var tenant = await _db.TenantRegistrations
                .FirstOrDefaultAsync(t => t.VendorId == vendorId);

            if (tenant == null)
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = $"No TenantRegistration found for vendor {vendorId}"
                });

            if (!string.IsNullOrWhiteSpace(tenant.RailwayDatabaseUrl))
                return Ok(new ApiResponseDto<object>
                {
                    Success = true,
                    Message = "Vendor already has a dedicated database",
                    Data = new { connectionString = tenant.RailwayDatabaseUrl[..Math.Min(60, tenant.RailwayDatabaseUrl.Length)] }
                });

            var connStr = await _dbProvisioning.ProvisionAsync(vendorId);

            tenant.RailwayDatabaseUrl = connStr;
            tenant.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin provisioned dedicated DB for vendor {VendorId}", vendorId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Dedicated database provisioned and migrations applied",
                Data = new { vendorId, databaseCreated = true }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error provisioning database for vendor {VendorId}", vendorId);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = $"Provisioning failed: {ex.Message}"
            });
        }
    }

    // POST api/platform/announce — broadcast a feature announcement to all active vendors
    [HttpPost("announce")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> AnnounceFeature(
        [FromBody] FeatureAnnouncementDto dto,
        [FromServices] RNVS.ECommerce.Infrastructure.Email.IEmailService emailService)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Title and body are required" });

            var tenants = await _db.TenantRegistrations
                .Where(t => t.Status == TenantStatus.Active || t.Status == TenantStatus.Trial)
                .ToListAsync();

            var vendorIds = tenants.Select(t => t.VendorId).Distinct().ToList();
            var users = await _db.Users
                .Where(u => vendorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            int sent = 0;
            foreach (var tenant in tenants)
            {
                if (!users.TryGetValue(tenant.VendorId, out var vendor) || string.IsNullOrEmpty(vendor.Email))
                    continue;

                var ok = await emailService.SendTemplateEmailAsync(
                    vendor.Email,
                    $"New from RNVS CommerceX: {dto.Title}",
                    "FeatureAnnouncement",
                    new Dictionary<string, string>
                    {
                        { "VendorName", $"{vendor.FirstName} {vendor.LastName}".Trim() },
                        { "StoreName", tenant.StoreName },
                        { "VendorEmail", vendor.Email },
                        { "AnnouncementTitle", dto.Title },
                        { "AnnouncementBody", dto.Body },
                        { "DashboardUrl", "http://localhost:3000/vendor/dashboard" },
                        { "SupportEmail", "support@rnvscommercex.com" },
                    });

                if (ok) sent++;
            }

            _logger.LogInformation("Feature announcement '{Title}' sent to {Count}/{Total} vendors", dto.Title, sent, tenants.Count);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = $"Announcement sent to {sent} vendor(s)",
                Data = new { sent, total = tenants.Count }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending feature announcement");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    // GET api/platform/sales-summary — per-vendor totals + platform grand total
    [HttpGet("sales-summary")]
    public async Task<IActionResult> GetSalesSummary()
    {
        try
        {
            var tenants = await _db.TenantRegistrations.AsNoTracking().ToListAsync();

            var vendorIds = tenants.Select(t => t.VendorId).Distinct().ToList();
            var vendorNames = await _db.Users
                .Where(u => vendorIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FirstName, u.LastName })
                .ToDictionaryAsync(u => u.Id);

            var vendors = new List<object>();
            decimal grandTotal = 0;

            foreach (var tenant in tenants)
            {
                vendorNames.TryGetValue(tenant.VendorId, out var v);
                var vendorName = v != null ? $"{v.FirstName} {v.LastName}".Trim() : null;

                if (string.IsNullOrEmpty(tenant.RailwayDatabaseUrl))
                {
                    vendors.Add(new
                    {
                        TenantId    = tenant.Id,
                        StoreName   = tenant.StoreName,
                        VendorName  = vendorName,
                        TotalSales  = (decimal?)0,
                        TotalOrders = 0,
                        DbStatus    = "not_provisioned"
                    });
                    continue;
                }

                try
                {
                    var opts = new DbContextOptionsBuilder<VendorDbContext>()
                        .UseNpgsql(tenant.RailwayDatabaseUrl)
                        .Options;
                    using var vdb = new VendorDbContext(opts);

                    var totalSales = await vdb.Orders
                        .Where(o => o.Status != RNVS.ECommerce.Domain.Enums.OrderStatus.Cancelled)
                        .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
                    var totalOrders = await vdb.Orders.CountAsync();

                    grandTotal += totalSales;

                    vendors.Add(new
                    {
                        TenantId    = tenant.Id,
                        StoreName   = tenant.StoreName,
                        VendorName  = vendorName,
                        TotalSales  = (decimal?)totalSales,
                        TotalOrders = totalOrders,
                        DbStatus    = "ok"
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not read sales for tenant {TenantId}", tenant.Id);
                    vendors.Add(new
                    {
                        TenantId    = tenant.Id,
                        StoreName   = tenant.StoreName,
                        VendorName  = vendorName,
                        TotalSales  = (decimal?)null,
                        TotalOrders = (int?)null,
                        DbStatus    = "error"
                    });
                }
            }

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    GrandTotal   = grandTotal,
                    VendorCount  = tenants.Count,
                    Vendors      = vendors
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching sales summary");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var tenants = await _db.TenantRegistrations.AsNoTracking().ToListAsync();
            var now = DateTime.UtcNow;

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    Total = tenants.Count,
                    Active = tenants.Count(t => t.Status == TenantStatus.Active),
                    Trial = tenants.Count(t => t.Status == TenantStatus.Trial),
                    Suspended = tenants.Count(t => t.Status == TenantStatus.Suspended),
                    BasicPlan = tenants.Count(t => t.Plan == PlanTier.Basic),
                    ProPlan = tenants.Count(t => t.Plan == PlanTier.Pro),
                    EnterprisePlan = tenants.Count(t => t.Plan == PlanTier.Enterprise),
                    WithDedicatedDb = tenants.Count(t => t.RailwayDatabaseUrl != null),
                    ActiveLast7Days = tenants.Count(t => t.LastActivityAt.HasValue && (now - t.LastActivityAt.Value).TotalDays <= 7),
                    Inactive30Days = tenants.Count(t => !t.LastActivityAt.HasValue || (now - t.LastActivityAt.Value).TotalDays > 30),
                    PendingMaintenance = tenants.Count(t => !string.IsNullOrEmpty(t.MaintenanceNotes))
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching platform stats");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

public class TenantSummaryDto
{
    public int Id { get; set; }
    public string VendorId { get; set; } = string.Empty;
    public string? VendorName { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string Plan { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool HasDedicatedDb { get; set; }
    public string? ServiceId { get; set; }
    public DateTime SubscriptionStartDate { get; set; }
    public DateTime? SubscriptionEndDate { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public int? DaysSinceLastActivity { get; set; }
    public bool HasMaintenanceNotes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TenantDetailDto : TenantSummaryDto
{
    public string? RailwayDatabaseUrl { get; set; }
    public string StoragePrefix { get; set; } = string.Empty;
    public string? MaintenanceNotes { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateTenantDto
{
    public string VendorId { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string Plan { get; set; } = "Basic";
}

public class UpdateTenantStatusDto
{
    public string Status { get; set; } = string.Empty;
}

public class UpdateNotesDto
{
    public string Note { get; set; } = string.Empty;
}

public class UpdateRailwayDto
{
    public string DatabaseUrl { get; set; } = string.Empty;
    public string? ServiceId { get; set; }
}

public class FeatureAnnouncementDto
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}
