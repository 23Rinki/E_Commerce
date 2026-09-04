using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RNVS.ECommerce.Infrastructure.Data;

/// <summary>
/// Design-time factory — used only by "dotnet ef migrations" CLI.
/// Uses a dummy local connection so migrations can be generated without a running app.
/// At runtime, VendorDbContext is created dynamically with the tenant's real connection string.
/// </summary>
public class VendorDbContextFactory : IDesignTimeDbContextFactory<VendorDbContext>
{
    public VendorDbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<VendorDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=RNVSVendor_Test1;Username=postgres;Password=postgres;SslMode=Disable")
            .Options;
        return new VendorDbContext(opts);
    }
}
