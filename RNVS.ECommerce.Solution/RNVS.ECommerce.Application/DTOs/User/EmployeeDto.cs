using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.User;

public class EmployeeDto
{
    public int Id { get; set; }
    public string VendorId { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string? EmployeeCode { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public DateTime JoinedDate { get; set; }
    public DateTime? TerminatedDate { get; set; }
    public bool IsActive { get; set; }
    public string? Permissions { get; set; }
    public decimal Salary { get; set; }
    public string? Notes { get; set; }
}

public class EmployeeCreateDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public string Designation { get; set; } = string.Empty;

    [Required]
    [Phone]
    public string PhoneNumber { get; set; } = string.Empty;

    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    public string? Permissions { get; set; }
    public decimal Salary { get; set; }
    public string? Notes { get; set; }
}

public class EmployeeUpdateDto
{
    public string? Designation { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public bool? IsActive { get; set; }
    public string? Permissions { get; set; }
    public decimal? Salary { get; set; }
    public string? Notes { get; set; }
}

public class EmployeeLoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
