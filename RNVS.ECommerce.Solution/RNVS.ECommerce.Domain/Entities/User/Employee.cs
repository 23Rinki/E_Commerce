using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.User;

/// <summary>
/// Vendor employee — stored entirely in the vendor's own database.
/// No dependency on the main platform database (AspNetUsers).
/// Credentials (email + passwordHash) live here, not in the main DB.
/// </summary>
public class Employee
{
    public int Id { get; set; }

    /// <summary>The vendor who owns this employee.</summary>
    [Required]
    [StringLength(450)]
    public string VendorId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>Login email — unique within this vendor's database.</summary>
    [Required]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    /// <summary>Hashed password — never stored in the main platform DB.</summary>
    [Required]
    [StringLength(512)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Designation { get; set; } = string.Empty;

    [StringLength(50)]
    public string? EmployeeCode { get; set; }

    [Required]
    [StringLength(15)]
    public string PhoneNumber { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Address { get; set; }

    [StringLength(100)]
    public string? City { get; set; }

    [StringLength(100)]
    public string? State { get; set; }

    [StringLength(20)]
    public string? PostalCode { get; set; }

    [StringLength(50)]
    public string? Country { get; set; }

    public DateTime JoinedDate { get; set; } = DateTime.UtcNow;
    public DateTime? TerminatedDate { get; set; }
    public bool IsActive { get; set; } = true;

    [StringLength(1000)]
    public string? Permissions { get; set; }

    public decimal Salary { get; set; } = 0;

    [StringLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
