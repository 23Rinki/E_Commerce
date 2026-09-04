using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RNVS.ECommerce.Domain.Entities.Analytics;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class UserBehaviorConfiguration : IEntityTypeConfiguration<UserBehavior>
{
    public void Configure(EntityTypeBuilder<UserBehavior> builder)
    {
        builder.HasKey(ub => ub.Id);

        builder.Property(ub => ub.SessionId)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(ub => ub.UserId);
        builder.HasIndex(ub => ub.SessionId);
        builder.HasIndex(ub => ub.EventType);
        builder.HasIndex(ub => ub.ProductId);
        builder.HasIndex(ub => ub.CreatedAt);
    }
}
