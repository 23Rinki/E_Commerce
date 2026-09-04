using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Category;

public class CategoryUpdateDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}
