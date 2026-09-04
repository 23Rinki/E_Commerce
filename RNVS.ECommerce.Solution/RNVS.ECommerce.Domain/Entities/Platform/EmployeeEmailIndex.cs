using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Platform;

/// <summary>
/// Routing-only table in the main platform database.
/// Maps an employee's email → their vendor's ID so the login system
/// knows which vendor database to connect to for authentication.
///
/// Stores NO passwords or sensitive employee data — purely a routing key.
/// The actual credentials live in the vendor's own database (Employee table).
/// </summary>
public class EmployeeEmailIndex
{
    [Key]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    /// <summary>The vendor (AspNetUsers.Id) who owns this employee.</summary>
    [Required]
    [StringLength(450)]
    public string VendorId { get; set; } = string.Empty;
}
