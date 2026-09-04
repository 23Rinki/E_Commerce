using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RNVS.ECommerce.Domain.Entities.System;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class ActivityLogConfiguration : IEntityTypeConfiguration<ActivityLog>
{
    public void Configure(EntityTypeBuilder<ActivityLog> builder)
    {
        builder.HasKey(al => al.Id);

        builder.Property(al => al.Action)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(al => al.UserId);
        builder.HasIndex(al => al.Action);
        builder.HasIndex(al => al.CreatedAt);
    }
}

public class PlatformSettingConfiguration : IEntityTypeConfiguration<PlatformSetting>
{
    public void Configure(EntityTypeBuilder<PlatformSetting> builder)
    {
        builder.HasKey(ps => ps.Id);

        builder.Property(ps => ps.Key)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(ps => ps.Value)
            .IsRequired();

        builder.HasIndex(ps => ps.Key).IsUnique();
        builder.HasIndex(ps => ps.Category);
    }
}
