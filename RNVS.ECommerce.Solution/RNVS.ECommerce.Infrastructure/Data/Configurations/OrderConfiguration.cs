using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RNVS.ECommerce.Domain.Entities.Order;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);

        builder.Property(o => o.OrderNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(o => o.SubTotal)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(o => o.TaxAmount)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(o => o.ShippingCost)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(o => o.TotalAmount)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.HasIndex(o => o.OrderNumber).IsUnique();
        builder.HasIndex(o => o.UserId);
        builder.HasIndex(o => o.CreatedAt);
    }
}

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.HasKey(oi => oi.Id);

        builder.Property(oi => oi.ProductName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(oi => oi.UnitPrice)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(oi => oi.TotalPrice)
            .HasColumnType("decimal(18,2)")
            .IsRequired();
    }
}

public class AddressConfiguration : IEntityTypeConfiguration<Address>
{
    public void Configure(EntityTypeBuilder<Address> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.Street)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.City)
            .HasMaxLength(100);

        builder.Property(a => a.State)
            .HasMaxLength(50);

        builder.Property(a => a.PostalCode)
            .HasMaxLength(20);

        builder.Property(a => a.Country)
            .HasMaxLength(50);
    }
}