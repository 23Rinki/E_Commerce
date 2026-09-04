using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Review;

public class CreateReviewDto
{
    [Required]
    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5")]
    public int Rating { get; set; }

    [StringLength(1000, ErrorMessage = "Comment cannot exceed 1000 characters")]
    public string? Comment { get; set; }

    [Required]
    public int ProductId { get; set; }
}
