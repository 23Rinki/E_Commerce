using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data;
using RNVS.ECommerce.Infrastructure.Email;

namespace RNVS.ECommerce.Infrastructure.Services;

public class DailyEmailSchedulerService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DailyEmailSchedulerService> _logger;

    public DailyEmailSchedulerService(IServiceScopeFactory scopeFactory, ILogger<DailyEmailSchedulerService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run immediately on startup so emails aren't missed during downtime
        await RunChecksAsync();

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = DateTime.UtcNow.Date.AddDays(1) - DateTime.UtcNow;
            // WhenAny never throws — returns when either the delay expires or the app shuts down
            await Task.WhenAny(Task.Delay(delay), Task.Delay(Timeout.Infinite, stoppingToken));

            if (!stoppingToken.IsCancellationRequested)
                await RunChecksAsync();
        }
    }

    private async Task RunChecksAsync()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            var today = DateTime.UtcNow.Date;

            var tenants = await db.TenantRegistrations
                .Where(t => t.Status == TenantStatus.Active || t.Status == TenantStatus.Trial)
                .ToListAsync();

            var vendorIds = tenants.Select(t => t.VendorId).Distinct().ToList();
            var users = await db.Users
                .Where(u => vendorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            bool anyChanges = false;

            foreach (var tenant in tenants)
            {
                if (!users.TryGetValue(tenant.VendorId, out var vendor) || string.IsNullOrEmpty(vendor.Email))
                    continue;

                var vendorName = $"{vendor.FirstName} {vendor.LastName}".Trim();

                // ── 3-month transition email (monthly vendors only) ──────────────────
                if (tenant.TransitionEmailSentAt == null)
                {
                    if (tenant.SubscriptionType == "Yearly")
                    {
                        // Yearly vendors never get a transition email — mark to skip forever
                        tenant.TransitionEmailSentAt = DateTime.UtcNow;
                        anyChanges = true;
                    }
                    else
                    {
                        var transitionDate = tenant.SubscriptionStartDate.Date.AddMonths(3);
                        if (today >= transitionDate)
                        {
                            var sent = await emailService.SendTemplateEmailAsync(
                                vendor.Email,
                                "Your RNVS CommerceX subscription is now ₹4,999/month",
                                "SubscriptionTransition",
                                new Dictionary<string, string>
                                {
                                    { "VendorName", vendorName },
                                    { "StoreName", tenant.StoreName },
                                    { "VendorEmail", vendor.Email },
                                    { "EffectiveDate", transitionDate.ToString("dd MMM yyyy") },
                                    { "DashboardUrl", "http://localhost:3000/vendor/dashboard" },
                                    { "SupportEmail", "support@rnvscommercex.com" },
                                });

                            if (sent)
                            {
                                tenant.TransitionEmailSentAt = DateTime.UtcNow;
                                anyChanges = true;
                                _logger.LogInformation("Transition email sent to vendor {VendorId}", tenant.VendorId);
                            }
                        }
                    }
                }

                // ── Anniversary reminder (monthly and yearly) ───────────────────────
                // Fires on the same day-of-month the vendor subscribed
                var anniversaryDay = tenant.SubscriptionStartDate.Day;
                var daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
                var effectiveDay = Math.Min(anniversaryDay, daysInMonth);

                if (today.Day == effectiveDay)
                {
                    var alreadySentThisMonth = tenant.LastMonthlyReminderSentAt.HasValue
                        && tenant.LastMonthlyReminderSentAt.Value.Year == today.Year
                        && tenant.LastMonthlyReminderSentAt.Value.Month == today.Month;

                    if (!alreadySentThisMonth)
                    {
                        string statusMessage;
                        string nextDate;
                        string reminderType;

                        if (tenant.SubscriptionType == "Yearly")
                        {
                            var expiry = tenant.SubscriptionEndDate ?? tenant.SubscriptionStartDate.AddYears(1);
                            nextDate = expiry.ToString("dd MMM yyyy");
                            reminderType = "Annual Subscription";
                            statusMessage = $"Your annual subscription is active until <strong>{nextDate}</strong>.";
                        }
                        else
                        {
                            // Next renewal = next month on the same anniversary day
                            var nextMonthStart = today.Month == 12
                                ? new DateTime(today.Year + 1, 1, 1)
                                : new DateTime(today.Year, today.Month + 1, 1);
                            var daysInNextMonth = DateTime.DaysInMonth(nextMonthStart.Year, nextMonthStart.Month);
                            var nextRenewal = new DateTime(
                                nextMonthStart.Year,
                                nextMonthStart.Month,
                                Math.Min(anniversaryDay, daysInNextMonth));
                            nextDate = nextRenewal.ToString("dd MMM yyyy");
                            reminderType = "Monthly Subscription";
                            statusMessage = $"Your next monthly renewal is on <strong>{nextDate}</strong>.";
                        }

                        var sent = await emailService.SendTemplateEmailAsync(
                            vendor.Email,
                            $"Your RNVS CommerceX subscription reminder — {tenant.StoreName}",
                            "MonthlyReminder",
                            new Dictionary<string, string>
                            {
                                { "VendorName", vendorName },
                                { "StoreName", tenant.StoreName },
                                { "VendorEmail", vendor.Email },
                                { "ReminderType", reminderType },
                                { "StatusMessage", statusMessage },
                                { "NextDate", nextDate },
                                { "DashboardUrl", "http://localhost:3000/vendor/dashboard" },
                                { "SupportEmail", "support@rnvscommercex.com" },
                            });

                        if (sent)
                        {
                            tenant.LastMonthlyReminderSentAt = DateTime.UtcNow;
                            anyChanges = true;
                            _logger.LogInformation("Anniversary reminder sent to vendor {VendorId} ({Type})", tenant.VendorId, reminderType);
                        }
                    }
                }

                // ── Payment overdue → suspend (7-day grace period past the due date) ─
                if (tenant.Status == TenantStatus.Active
                    && tenant.SubscriptionEndDate.HasValue
                    && today >= tenant.SubscriptionEndDate.Value.Date.AddDays(7)
                    && tenant.SuspensionEmailSentAt == null)
                {
                    var sent = await emailService.SendTemplateEmailAsync(
                        vendor.Email,
                        $"Your RNVS CommerceX account has been suspended — {tenant.StoreName}",
                        "PaymentOverdueSuspended",
                        new Dictionary<string, string>
                        {
                            { "VendorName", vendorName },
                            { "StoreName", tenant.StoreName },
                            { "VendorEmail", vendor.Email },
                            { "DueDate", tenant.SubscriptionEndDate.Value.ToString("dd MMM yyyy") },
                            { "SuspendedDate", today.ToString("dd MMM yyyy") },
                            { "PaymentUrl", "http://localhost:3000/vendor/payment" },
                            { "SupportEmail", "support@rnvscommercex.com" },
                        });

                    tenant.Status = TenantStatus.Suspended;
                    tenant.SuspensionEmailSentAt = DateTime.UtcNow;
                    anyChanges = true;
                    _logger.LogWarning("Vendor {VendorId} suspended for non-payment (due {DueDate}, email sent: {Sent})",
                        tenant.VendorId, tenant.SubscriptionEndDate.Value, sent);
                }
            }

            if (anyChanges)
                await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Daily email scheduler error");
        }
    }
}
