using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.User;

public class VendorApplicationDto
{
    [Required]
    [StringLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [Required]
    public string Address { get; set; } = string.Empty;
}