using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using RNVS.ECommerce.Application.Interfaces.Services;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.Infrastructure.Services;

/// <summary>
/// Provisions an isolated PostgreSQL database for a new vendor on registration.
/// Uses the same server as the shared VendorConnection but creates a new database.
/// MigrateAsync() both creates the database and applies all VendorDbContext migrations.
/// </summary>
public class VendorDatabaseProvisioningService : IVendorDatabaseProvisioningService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<VendorDatabaseProvisioningService> _logger;

    public VendorDatabaseProvisioningService(
        IConfiguration configuration,
        ILogger<VendorDatabaseProvisioningService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<string> ProvisionAsync(string vendorId, string? storeName = null)
    {
        // Build DB name: RNVSVendor_{sanitized_store_name}_{short6hexid}
        var shortId = vendorId.Replace("-", "")[..6].ToLower();
        var sanitized = Regex.Replace((storeName ?? "vendor").ToLower(), @"[^a-z0-9]", "");
        if (sanitized.Length == 0) sanitized = "vendor";
        if (sanitized.Length > 15) sanitized = sanitized[..15];
        var dbName = $"RNVSVendor_{sanitized}_{shortId}";

        var baseConn = _configuration.GetConnectionString("VendorConnection")
            ?? _configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("No VendorConnection found in configuration.");

        var vendorConnStr = ReplaceDatabase(baseConn, dbName);

        _logger.LogInformation("Provisioning vendor database {DbName} for vendor {VendorId}", dbName, vendorId);

        var opts = new DbContextOptionsBuilder<VendorDbContext>()
            .UseNpgsql(vendorConnStr)
            .Options;

        await using var ctx = new VendorDbContext(opts);

        // Creates the database if it does not exist and applies all pending migrations
        await ctx.Database.MigrateAsync();

        // Seed default categories so the vendor's product form is ready from day one
        var defaultCategories = _configuration.GetSection("DefaultCategories").Get<List<string>>() ?? new();
        if (defaultCategories.Count > 0)
        {
            var categories = defaultCategories.Select(name => new Category
            {
                Name = name,
                Description = name,
                IsActive = true,
            }).ToList();
            await ctx.Categories.AddRangeAsync(categories);
            await ctx.SaveChangesAsync();
            _logger.LogInformation("Seeded {Count} default categories into {DbName}", categories.Count, dbName);
        }

        _logger.LogInformation("Vendor database {DbName} provisioned successfully", dbName);

        return vendorConnStr;
    }

    private static string ReplaceDatabase(string connectionString, string newDatabase)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Database = newDatabase
        };
        return builder.ToString();
    }
}
