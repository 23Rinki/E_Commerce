using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> builder)
    {
        builder.HasKey(pv => pv.Id);

        builder.Property(pv => pv.SKU)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(pv => pv.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(pv => pv.Price)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(pv => pv.CompareAtPrice)
            .HasColumnType("decimal(18,2)");

        builder.HasIndex(pv => pv.SKU).IsUnique();
        builder.HasIndex(pv => pv.ProductId);
    }
}
