using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RNVS.ECommerce.Domain.Entities.Order;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class OrderStatusHistoryConfiguration : IEntityTypeConfiguration<OrderStatusHistory>
{
    public void Configure(EntityTypeBuilder<OrderStatusHistory> builder)
    {
        builder.HasKey(osh => osh.Id);

        builder.HasIndex(osh => osh.OrderId);
        builder.HasIndex(osh => osh.CreatedAt);
    }
}
