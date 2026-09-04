namespace RNVS.ECommerce.Application.DTOs.Review;

public class ReviewDto
{
    public int Id { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public int ProductId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsApproved { get; set; }
}
