namespace RNVS.ECommerce.Application.DTOs.PaymentMethod;

public class PaymentMethodDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? LastFourDigits { get; set; }
    public string? BrandName { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
}
