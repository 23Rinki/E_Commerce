using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Product;

public class Category
{
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public string? VendorId { get; set; }
}