using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Application.DTOs.User;

public class UserRegistrationDto
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    [Compare("Password")]
    public string ConfirmPassword { get; set; } = string.Empty;

    [Phone]
    public string? PhoneNumber { get; set; }

    public UserRole Role { get; set; } = UserRole.Customer;

    // Only required when Role = Vendor
    [StringLength(200)]
    public string? StoreName { get; set; }

    // Vendor business verification fields
    [StringLength(30)]
    public string? UdyamCertificateNumber { get; set; }

    [StringLength(20)]
    public string? CompanyPanNumber { get; set; }

    [StringLength(20)]
    public string? GstNumber { get; set; }
}