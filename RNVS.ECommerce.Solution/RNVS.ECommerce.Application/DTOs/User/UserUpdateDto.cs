using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.User;

public class UserUpdateDto
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Phone]
    public string? PhoneNumber { get; set; }
}