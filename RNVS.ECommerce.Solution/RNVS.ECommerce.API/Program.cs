using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Infrastructure.Caching;
using RNVS.ECommerce.Infrastructure.Data;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Infrastructure.Data.Repositories;
using RNVS.ECommerce.Infrastructure.Email;
using RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;
using RNVS.ECommerce.Infrastructure.ML;
using RNVS.ECommerce.Infrastructure.Payment;
using RNVS.ECommerce.Infrastructure.PDF;
using RNVS.ECommerce.Infrastructure.Search;
using RNVS.ECommerce.Infrastructure.Security;
using RNVS.ECommerce.Infrastructure.Security.Models;
using RNVS.ECommerce.Infrastructure.SMS;
using RNVS.ECommerce.Infrastructure.Storage;
using RNVS.ECommerce.Infrastructure.Tenant;
using RNVS.ECommerce.Infrastructure.Services;
using IVendorDbProvisioning = RNVS.ECommerce.Application.Interfaces.Services.IVendorDatabaseProvisioningService;
using RNVS.ECommerce.API.Middleware;
using Serilog;
// using RNVS.ECommerce.API.Data; // Data directory doesn't exist
using System.Text;

// Disable ImageSharp native memory pool entirely — avoids ExecutionEngineException from pool corruption on .NET 9
SixLabors.ImageSharp.Configuration.Default.MemoryAllocator =
    SixLabors.ImageSharp.Memory.MemoryAllocator.Create(
        new SixLabors.ImageSharp.Memory.MemoryAllocatorOptions { MaximumPoolSizeMegabytes = 0 });

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        path: "Logs/ecommerce.log",
        rollingInterval: RollingInterval.Infinite,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} | {Message:lj}{NewLine}{Exception}",
        fileSizeLimitBytes: 50_000_000,
        rollOnFileSizeLimit: true,
        retainedFileCountLimit: 3
    )
    .WriteTo.Map(
        "VendorIdentifier",
        defaultKey: "system",
        (vendorKey, wt) => wt.File(
            path: $"Logs/vendors/{vendorKey}.log",
            rollingInterval: RollingInterval.Infinite,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} | {Message:lj}{NewLine}{Exception}",
            fileSizeLimitBytes: 50_000_000,
            rollOnFileSizeLimit: true,
            retainedFileCountLimit: null
        ),
        sinkMapCountLimit: 50
    )
    .CreateLogger();

// Add Serilog
builder.Host.UseSerilog();

// Add services to the container.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();

// Employee password hasher — used by EmployeeController and AuthController for vendor-DB-only auth
builder.Services.AddScoped<IPasswordHasher<Employee>, PasswordHasher<Employee>>();

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options => options.SignIn.RequireConfirmedAccount = false)
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders()
    .AddDefaultUI();

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Security:Jwt");
var secretKey = jwtSettings.GetValue<string>("SecretKey");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = false; // Set to true in production
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.GetValue<string>("Issuer"),
        ValidAudience = jwtSettings.GetValue<string>("Audience"),
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddControllersWithViews();

// Return our own ApiResponseDto format instead of the default Problem Details
// when [ApiController] auto-validation rejects a request (400 model state errors).
// Without this override the frontend receives { "title": "One or more validation errors occurred." }
// which gives no field-level detail.
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .Where(m => !string.IsNullOrEmpty(m))
            .ToList();
        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new
        {
            success = false,
            message = errors.Count > 0 ? errors[0] : "Validation failed",
            errors
        });
    };
});

// Add CORS for Next.js frontend
// Reads from "AllowedOrigins" config (array) so production origins can be set via env vars
// (e.g. AllowedOrigins__0=https://shop.rnvsai.com) without touching this default for local dev.
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "https://localhost:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("NextJsPolicy", builder =>
    {
        builder.WithOrigins(allowedOrigins)
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});

// Register Shipping Services
builder.Services.AddHttpClient<BlueDartShippingService>()
    .AddPolicyHandler(BaseShippingService.GetRetryPolicy());

builder.Services.AddHttpClient<DelhiveryShippingService>()
    .AddPolicyHandler(BaseShippingService.GetRetryPolicy());

builder.Services.AddHttpClient<DtdcShippingService>()
    .AddPolicyHandler(BaseShippingService.GetRetryPolicy());

builder.Services.AddHttpClient<FedExShippingService>()
    .AddPolicyHandler(BaseShippingService.GetRetryPolicy());

builder.Services.AddHttpClient<UPSShippingService>()
    .AddPolicyHandler(BaseShippingService.GetRetryPolicy());

builder.Services.AddHttpClient<InHouseShippingService>()
    .AddPolicyHandler(BaseShippingService.GetRetryPolicy());

builder.Services.AddHttpClient<SelfPickupService>()
    .AddPolicyHandler(BaseShippingService.GetRetryPolicy());

// Register as IShippingProvider
builder.Services.AddScoped<IShippingProvider, BlueDartShippingService>();
builder.Services.AddScoped<IShippingProvider, DelhiveryShippingService>();
builder.Services.AddScoped<IShippingProvider, DtdcShippingService>();
builder.Services.AddScoped<IShippingProvider, FedExShippingService>();
builder.Services.AddScoped<IShippingProvider, UPSShippingService>();
builder.Services.AddScoped<IShippingProvider, InHouseShippingService>();
builder.Services.AddScoped<IShippingProvider, SelfPickupService>();

// Register Tenant Services — resolves vendor identity and routes to their isolated DB
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantResolver, JwtTenantResolver>();
builder.Services.AddScoped<TenantContext>();
builder.Services.AddScoped<ITenantContext>(sp => sp.GetRequiredService<TenantContext>());

// VendorDbContext — dynamic per-tenant connection (Phase 2: routes to vendor's own DB)
builder.Services.AddScoped<VendorDbContext>(sp =>
{
    var tenantCtx = sp.GetRequiredService<ITenantContext>();
    var opts = new DbContextOptionsBuilder<VendorDbContext>()
        .UseNpgsql(tenantCtx.ConnectionString)
        .Options;
    return new VendorDbContext(opts);
});

// Register Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IProductImageRepository, ProductImageRepository>();
builder.Services.AddScoped<ICartRepository, CartRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IUserBehaviorRepository, UserBehaviorRepository>();

// Register Payment Services
builder.Services.AddHttpClient<StripePaymentService>();
builder.Services.AddHttpClient<PayPalPaymentService>();

builder.Services.AddScoped<IPaymentProcessor, StripePaymentService>();
builder.Services.AddScoped<IPaymentProcessor, PayPalPaymentService>();
builder.Services.AddScoped<PaymentFactory>();

// Register ML Services
builder.Services.AddScoped<IRecommendationEngine, ProductRecommendationService>();
builder.Services.AddScoped<UserBehaviorAnalyzer>();

// Configure JWT Settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Security:Jwt"));

// Register Security Services
builder.Services.AddScoped<JwtTokenService>();
builder.Services.Configure<TwoFactorOptions>(builder.Configuration.GetSection("Security:TwoFactor"));
builder.Services.AddScoped<TwoFactorAuthService>();

// Register SMS Service
builder.Services.AddScoped<ISmsService, TwilioSmsService>();
builder.Services.AddMemoryCache(); // Required for OTP caching

// Register Email Service
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

// Register File Storage Service (default to Local, can be configured)
builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
// Alternative: builder.Services.AddScoped<IFileStorageService, S3FileStorageService>();

// Register PDF Services
builder.Services.AddScoped<IPdfGenerator, PdfGenerator>();
builder.Services.AddScoped<PdfInvoiceGenerator>();
builder.Services.AddScoped<PdfReceiptGenerator>();

// Register Search Service
builder.Services.AddScoped<ISearchService, MeilisearchService>();
// Alternatives: builder.Services.AddScoped<ISearchService, SqlSearchService>();
//               builder.Services.AddScoped<ISearchService, ElasticsearchService>();

// Register Cache Service (default to Memory, can be configured)
builder.Services.AddScoped<ICacheService, MemoryCacheService>();
// Alternative: builder.Services.AddScoped<ICacheService, RedisCacheService>();

// Register Vendor Database Provisioning (auto-creates per-vendor DB on registration)
builder.Services.AddScoped<IVendorDbProvisioning, VendorDatabaseProvisioningService>();

// Storefront aggregation — queries ALL vendor DBs so customers see every vendor's products
builder.Services.AddScoped<StorefrontProductsService>();

// Daily email scheduler — sends subscription transition and anniversary reminders
builder.Services.AddHostedService<DailyEmailSchedulerService>();

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by a space and then your JWT token. Example: 'Bearer eyJhbGc...'",
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// ── Auto-migrate main database (RNVSECommerce) ───────────────────────────────
{
    using var scope = app.Services.CreateScope();
    var mainDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await mainDb.Database.MigrateAsync();
}

using (var scope = app.Services.CreateScope())
{
    var userManager    = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var categoryRepo   = scope.ServiceProvider.GetRequiredService<ICategoryRepository>();
    var config         = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    // ── Admin / SuperAdmin accounts ──────────────────────────────────────────
    // Creates if missing; syncs role and resets password on every startup so
    // credentials in appsettings.json are always authoritative.
    var adminAccounts = config.GetSection("AdminAccounts").Get<List<AdminAccountSeed>>() ?? [];
    foreach (var account in adminAccounts)
    {
        var role = Enum.TryParse<RNVS.ECommerce.Domain.Enums.UserRole>(account.Role, out var r)
            ? r : RNVS.ECommerce.Domain.Enums.UserRole.Admin;

        var existing = await userManager.FindByEmailAsync(account.Email);
        if (existing == null)
        {
            var user = new ApplicationUser
            {
                UserName = account.Email, Email = account.Email,
                FirstName = account.FirstName, LastName = account.LastName,
                EmailConfirmed = true, IsActive = true, Role = role, CreatedAt = DateTime.UtcNow
            };
            await userManager.CreateAsync(user, account.Password);
        }
        else
        {
            // Always sync role
            if (existing.Role != role)
            {
                existing.Role = role;
                await userManager.UpdateAsync(existing);
            }
            // Reset password so appsettings.json is always authoritative
            var resetToken = await userManager.GeneratePasswordResetTokenAsync(existing);
            await userManager.ResetPasswordAsync(existing, resetToken, account.Password);
        }
    }

    // ── Dev / test accounts ──────────────────────────────────────────────────
    // Creates if missing AND resets password on every startup so credentials in
    // appsettings.json are always authoritative. Safe for development only.
    var devAccounts = config.GetSection("DevAccounts").Get<List<AdminAccountSeed>>() ?? [];
    foreach (var account in devAccounts)
    {
        var role = Enum.TryParse<RNVS.ECommerce.Domain.Enums.UserRole>(account.Role, out var r)
            ? r : RNVS.ECommerce.Domain.Enums.UserRole.Customer;

        var existing = await userManager.FindByEmailAsync(account.Email);
        if (existing == null)
        {
            var user = new ApplicationUser
            {
                UserName = account.Email, Email = account.Email,
                FirstName = account.FirstName, LastName = account.LastName,
                EmailConfirmed = true, IsActive = true, Role = role,
                IsVendor = role == RNVS.ECommerce.Domain.Enums.UserRole.Vendor,
                IsVendorApproved = role == RNVS.ECommerce.Domain.Enums.UserRole.Vendor,
                CreatedAt = DateTime.UtcNow
            };
            await userManager.CreateAsync(user, account.Password);
            existing = await userManager.FindByEmailAsync(account.Email);
        }
        else
        {
            // Always sync role and reset password so appsettings.json is the source of truth
            existing.Role = role;
            existing.IsVendor = role == RNVS.ECommerce.Domain.Enums.UserRole.Vendor;
            existing.IsVendorApproved = role == RNVS.ECommerce.Domain.Enums.UserRole.Vendor;
            await userManager.UpdateAsync(existing);
            await userManager.RemovePasswordAsync(existing);
            await userManager.AddPasswordAsync(existing, account.Password);
        }

        // Ensure vendors seeded here have a TenantRegistration (signup flow creates one,
        // but direct seeding bypasses that endpoint)
        if (existing != null && role == RNVS.ECommerce.Domain.Enums.UserRole.Vendor)
        {
            using var seedScope = app.Services.CreateScope();
            var seedDb = seedScope.ServiceProvider.GetRequiredService<RNVS.ECommerce.Infrastructure.Data.ApplicationDbContext>();
            var hasTenant = await seedDb.TenantRegistrations.AnyAsync(t => t.VendorId == existing.Id);
            if (!hasTenant)
            {
                seedDb.TenantRegistrations.Add(new RNVS.ECommerce.Domain.Entities.Platform.TenantRegistration
                {
                    VendorId = existing.Id,
                    StoreName = $"{existing.FirstName}'s Store",
                    ContactEmail = existing.Email!,
                    ContactPhone = existing.PhoneNumber,
                    Plan = RNVS.ECommerce.Domain.Enums.PlanTier.Basic,
                    Status = RNVS.ECommerce.Domain.Enums.TenantStatus.Active,
                    StoragePrefix = $"vendor-{existing.Id}/",
                    SubscriptionStartDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                await seedDb.SaveChangesAsync();
            }
        }
    }

    // ── Backfill TenantRegistration for any vendor without one ───────────────
    // Covers vendors who registered before auto-create was added, or via direct DB.
    {
        using var bfScope = app.Services.CreateScope();
        var bfDb = bfScope.ServiceProvider.GetRequiredService<RNVS.ECommerce.Infrastructure.Data.ApplicationDbContext>();
        var allVendors = await bfDb.Users
            .Where(u => u.Role == RNVS.ECommerce.Domain.Enums.UserRole.Vendor)
            .ToListAsync();
        var registeredVendorIds = await bfDb.TenantRegistrations
            .Select(t => t.VendorId)
            .ToListAsync();
        foreach (var vendor in allVendors.Where(v => !registeredVendorIds.Contains(v.Id)))
        {
            bfDb.TenantRegistrations.Add(new RNVS.ECommerce.Domain.Entities.Platform.TenantRegistration
            {
                VendorId = vendor.Id,
                StoreName = $"{vendor.FirstName}'s Store",
                ContactEmail = vendor.Email!,
                ContactPhone = vendor.PhoneNumber,
                Plan = RNVS.ECommerce.Domain.Enums.PlanTier.Basic,
                Status = RNVS.ECommerce.Domain.Enums.TenantStatus.Active,
                StoragePrefix = $"vendor-{vendor.Id}/",
                SubscriptionStartDate = vendor.CreatedAt,
                CreatedAt = vendor.CreatedAt,
                UpdatedAt = DateTime.UtcNow
            });
        }
        if (allVendors.Any(v => !registeredVendorIds.Contains(v.Id)))
            await bfDb.SaveChangesAsync();
    }

    // ── Default categories ───────────────────────────────────────────────────
    // Adds any missing categories from the config list. Never deletes existing ones.
    var categoryNames = config.GetSection("DefaultCategories").Get<List<string>>() ?? [];
    foreach (var name in categoryNames)
    {
        var existing = await categoryRepo.GetByNameAsync(name);
        if (existing == null)
        {
            await categoryRepo.AddAsync(new RNVS.ECommerce.Domain.Entities.Product.Category
            {
                Name = name,
                Description = name,
                IsActive = true
            });
        }
    }

    // ── Auto-migrate all vendor databases ────────────────────────────────────
    // Applies any pending EF migrations to every vendor DB on startup.
    // This means you only need `dotnet ef migrations add` — never `dotnet ef database update`.
    {
        using var migrateScope = app.Services.CreateScope();
        var mainDb = migrateScope.ServiceProvider.GetRequiredService<RNVS.ECommerce.Infrastructure.Data.ApplicationDbContext>();
        var logger = migrateScope.ServiceProvider.GetRequiredService<ILogger<Program>>();

        var tenants = await mainDb.TenantRegistrations
            .Where(t => t.RailwayDatabaseUrl != null)
            .Select(t => new { t.StoreName, t.RailwayDatabaseUrl })
            .ToListAsync();

        foreach (var tenant in tenants)
        {
            try
            {
                var opts = new DbContextOptionsBuilder<RNVS.ECommerce.Infrastructure.Data.VendorDbContext>()
                    .UseNpgsql(tenant.RailwayDatabaseUrl)
                    .Options;
                await using var vendorCtx = new RNVS.ECommerce.Infrastructure.Data.VendorDbContext(opts);
                await vendorCtx.Database.MigrateAsync();
                logger.LogInformation("Vendor DB migrated: {StoreName}", tenant.StoreName);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to migrate vendor DB: {StoreName}", tenant.StoreName);
            }
        }
    }
}

// Trust X-Forwarded-Proto/X-Forwarded-For from the reverse proxy (Traefik/Cloudflare Tunnel) sitting
// in front of this container — without this, UseHttpsRedirection below sees every request as plain
// HTTP (the proxy terminates TLS and forwards HTTP internally) and redirect-loops forever.
{
    var forwardedHeadersOptions = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    };
    // Requests arrive from Traefik's Docker-bridge IP, not loopback — clear the default
    // known-networks/proxies allowlist so the headers aren't silently ignored.
    forwardedHeadersOptions.KnownNetworks.Clear();
    forwardedHeadersOptions.KnownProxies.Clear();
    app.UseForwardedHeaders(forwardedHeadersOptions);
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "RNVS ECommerce API v1"));

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.UseCors("NextJsPolicy");

app.UseMiddleware<RateLimitingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// Push vendor identifier into Serilog log context so per-vendor log files are populated
app.Use(async (context, next) =>
{
    var email = context.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
    if (!string.IsNullOrEmpty(email))
    {
        var vendorKey = email.Split('@')[0].ToLowerInvariant();
        using (Serilog.Context.LogContext.PushProperty("VendorIdentifier", vendorKey))
        {
            await next();
            return;
        }
    }
    await next();
});

// Track last activity per vendor — powers the platform admin "Last Active" column
app.UseMiddleware<TenantActivityMiddleware>();

// Block Vendor/Employee access once the tenant is Suspended for non-payment
app.UseMiddleware<RNVS.ECommerce.API.Middleware.SubscriptionEnforcementMiddleware>();

app.MapStaticAssets();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.MapRazorPages()
   .WithStaticAssets();

app.Run();

// Simple DTO used only for config binding in the admin seeding block above
public class AdminAccountSeed
{
    public string Email     { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName  { get; set; } = string.Empty;
    public string Password  { get; set; } = string.Empty;
    public string Role      { get; set; } = "Admin";
}