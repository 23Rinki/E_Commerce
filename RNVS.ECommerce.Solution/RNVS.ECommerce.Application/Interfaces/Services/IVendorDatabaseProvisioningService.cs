namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IVendorDatabaseProvisioningService
{
    /// <summary>
    /// Creates a dedicated PostgreSQL database for the vendor, applies all VendorDbContext
    /// migrations, and returns the connection string to store in TenantRegistration.
    /// </summary>
    Task<string> ProvisionAsync(string vendorId, string? storeName = null);
}
