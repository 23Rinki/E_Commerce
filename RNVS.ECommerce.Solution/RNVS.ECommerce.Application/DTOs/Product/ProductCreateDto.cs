using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Product;

public class ProductCreateDto
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(120)]
    public string? ShortDescription { get; set; }

    [StringLength(2000)]
    public string? Description { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Price { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal? DiscountPrice { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int StockQuantity { get; set; }

    [Required]
    public int CategoryId { get; set; }
}