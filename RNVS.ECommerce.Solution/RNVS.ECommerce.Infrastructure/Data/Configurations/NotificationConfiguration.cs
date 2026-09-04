using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RNVS.ECommerce.Domain.Entities.Notification;

namespace RNVS.ECommerce.Infrastructure.Data.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(n => n.Message)
            .IsRequired()
            .HasMaxLength(1000);

        builder.HasIndex(n => n.UserId);
        builder.HasIndex(n => n.IsRead);
        builder.HasIndex(n => n.CreatedAt);
    }
}

public class EmailQueueConfiguration : IEntityTypeConfiguration<EmailQueue>
{
    public void Configure(EntityTypeBuilder<EmailQueue> builder)
    {
        builder.HasKey(eq => eq.Id);

        builder.Property(eq => eq.To)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(eq => eq.Subject)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(eq => eq.Body)
            .IsRequired();

        builder.HasIndex(eq => eq.Status);
        builder.HasIndex(eq => eq.CreatedAt);
    }
}
