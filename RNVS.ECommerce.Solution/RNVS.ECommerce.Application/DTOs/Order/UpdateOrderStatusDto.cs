using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Order;

public class UpdateOrderStatusDto
{
    [Required]
    public int Status { get; set; }

    [StringLength(500)]
    public string? Comment { get; set; }
}
