using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Platform;

/// <summary>
/// One row per vendor. Lives in the Master DB (shared).
/// Tracks subscription, Railway DB URL, and support info so the platform owner
/// can quickly understand any vendor's setup when they request maintenance.
/// </summary>
public class TenantRegistration
{
    public int Id { get; set; }

    /// <summary>ASP.NET Identity user ID of the vendor.</summary>
    public string VendorId { get; set; } = string.Empty;

    /// <summary>Human-readable store name.</summary>
    public string StoreName { get; set; } = string.Empty;

    public string ContactEmail { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }

    public PlanTier Plan { get; set; } = PlanTier.Basic;
    public TenantStatus Status { get; set; } = TenantStatus.Trial;

    /// <summary>
    /// Railway PostgreSQL URL for this vendor's isolated database.
    /// Null = still using the shared database (Phase 1 / Basic plan).
    /// </summary>
    public string? RailwayDatabaseUrl { get; set; }

    /// <summary>Railway service ID — useful for support & billing lookups.</summary>
    public string? RailwayServiceId { get; set; }

    /// <summary>Udyam Registration Certificate number (UDYAM-XX-00-0000000).</summary>
    public string? UdyamCertificateNumber { get; set; }

    /// <summary>Company / proprietor PAN card number.</summary>
    public string? CompanyPanNumber { get; set; }

    /// <summary>GST registration number (optional — not all MSMEs are GST registered).</summary>
    public string? GstNumber { get; set; }

    /// <summary>S3 / Azure Blob prefix for this vendor's files. e.g. "vendor-42/products/"</summary>
    public string StoragePrefix { get; set; } = string.Empty;

    public DateTime SubscriptionStartDate { get; set; } = DateTime.UtcNow;
    public DateTime? SubscriptionEndDate { get; set; }

    /// <summary>Monthly or Yearly — determines reminder email content and frequency.</summary>
    public string SubscriptionType { get; set; } = "Monthly";

    /// <summary>Set when the intro→regular transition email (₹2,999→₹4,999) is sent. Prevents duplicate sends.</summary>
    public DateTime? TransitionEmailSentAt { get; set; }

    /// <summary>Tracks when the last monthly reminder was sent. Prevents double-sending if API restarts.</summary>
    public DateTime? LastMonthlyReminderSentAt { get; set; }

    /// <summary>Set when the payment-overdue suspension email is sent. Cleared on next successful payment. Prevents duplicate sends.</summary>
    public DateTime? SuspensionEmailSentAt { get; set; }

    /// <summary>Updated on every authenticated API request — used to detect inactive vendors.</summary>
    public DateTime? LastActivityAt { get; set; }

    /// <summary>
    /// Platform owner maintenance notes. Use this to log issues, fixes, calls, etc.
    /// Makes it fast to understand context when a vendor reports a problem.
    /// </summary>
    public string? MaintenanceNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Confirmed violations (rejected flagged products, upheld customer reports) counted against this vendor.</summary>
    public int StrikeCount { get; set; } = 0;

    /// <summary>True = every new/updated product needs manual admin approval before going live.</summary>
    public bool RequiresApproval { get; set; } = true;
}
