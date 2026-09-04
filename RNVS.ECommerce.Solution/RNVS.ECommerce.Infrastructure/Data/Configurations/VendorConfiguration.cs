using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RNVS.ECommerce.Domain.Entities.Vendor;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class VendorPayoutConfiguration : IEntityTypeConfiguration<VendorPayout>
{
    public void Configure(EntityTypeBuilder<VendorPayout> builder)
    {
        builder.HasKey(vp => vp.Id);

        builder.Property(vp => vp.PayoutNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(vp => vp.Amount)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.HasIndex(vp => vp.PayoutNumber).IsUnique();
        builder.HasIndex(vp => vp.VendorId);
        builder.HasIndex(vp => vp.Status);
        builder.HasIndex(vp => vp.CreatedAt);
    }
}

public class VendorPayoutItemConfiguration : IEntityTypeConfiguration<VendorPayoutItem>
{
    public void Configure(EntityTypeBuilder<VendorPayoutItem> builder)
    {
        builder.HasKey(vpi => vpi.Id);

        builder.Property(vpi => vpi.Amount)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.HasIndex(vpi => vpi.PayoutId);
        builder.HasIndex(vpi => vpi.OrderId);
    }
}
