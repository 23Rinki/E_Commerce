using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.User;

public class CompanyProfile
{
    public int Id { get; set; }

    [Required]
    [StringLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [StringLength(500)]
    public string? LogoPath { get; set; }

    [StringLength(300)]
    public string? Address { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string UserId { get; set; } = string.Empty;

    public string? VendorId { get; set; }

    // Personal info — mirrored from ApplicationUser in main DB
    [StringLength(100)]
    public string? FirstName { get; set; }

    [StringLength(100)]
    public string? LastName { get; set; }

    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    // Business verification fields — mirrored from TenantRegistration in main DB
    [StringLength(30)]
    public string? UdyamCertificateNumber { get; set; }

    [StringLength(20)]
    public string? CompanyPanNumber { get; set; }

    [StringLength(20)]
    public string? GstNumber { get; set; }
}