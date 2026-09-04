using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RNVS.ECommerce.Domain.Entities.User;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(u => u.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(u => u.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasOne(u => u.CompanyProfile)
            .WithOne()
            .HasForeignKey<CompanyProfile>(c => c.UserId);

        builder.HasIndex(u => u.Email);
    }
}

public class CompanyProfileConfiguration : IEntityTypeConfiguration<CompanyProfile>
{
    public void Configure(EntityTypeBuilder<CompanyProfile> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.CompanyName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.LogoPath)
            .HasMaxLength(500);

        builder.Property(c => c.Address)
            .HasMaxLength(300);
    }
}