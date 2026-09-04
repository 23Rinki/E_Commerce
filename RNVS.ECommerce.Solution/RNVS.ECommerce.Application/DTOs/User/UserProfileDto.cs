using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Application.DTOs.User;

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsVendor { get; set; }
    public bool IsVendorApproved { get; set; }
    public UserRole Role { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public CompanyProfileDto? CompanyProfile { get; set; }
}