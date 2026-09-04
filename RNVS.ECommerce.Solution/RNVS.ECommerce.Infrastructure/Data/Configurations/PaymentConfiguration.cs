using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentEntity = RNVS.ECommerce.Domain.Entities.Payment.Payment;
using PaymentMethodEntity = RNVS.ECommerce.Domain.Entities.Payment.PaymentMethod;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<PaymentEntity>
{
    public void Configure(EntityTypeBuilder<PaymentEntity> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Amount)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(p => p.Method)
            .HasColumnName("MethodId");

        builder.Property(p => p.Status)
            .HasColumnName("Status");

        builder.Property(p => p.TransactionId)
            .HasMaxLength(100);

        builder.HasIndex(p => p.OrderId);
        builder.HasIndex(p => p.TransactionId);
    }
}

public class PaymentMethodConfiguration : IEntityTypeConfiguration<PaymentMethodEntity>
{
    public void Configure(EntityTypeBuilder<PaymentMethodEntity> builder)
    {
        builder.HasKey(pm => pm.Id);

        builder.Property(pm => pm.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(pm => pm.LastFourDigits)
            .HasMaxLength(4);

        builder.Property(pm => pm.BrandName)
            .HasMaxLength(50);
    }
}