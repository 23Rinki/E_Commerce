using Microsoft.AspNetCore.Identity;
using RNVS.ECommerce.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.User;

public class ApplicationUser : IdentityUser
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public UserRole Role { get; set; } = UserRole.Customer;

    public bool IsVendor { get; set; } = false;
    public bool IsVendorApproved { get; set; } = false;

    [StringLength(15)]
    public string? GstNumber { get; set; }

    // TOTP secret for authenticator-app 2FA. IdentityUser already provides TwoFactorEnabled;
    // this only gets set once the user has scanned the QR code and verified a code back.
    [StringLength(64)]
    public string? TwoFactorSecretKey { get; set; }

    public string FullName => $"{FirstName} {LastName}";

    // Navigation property
    public CompanyProfile? CompanyProfile { get; set; }
}