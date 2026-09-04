namespace RNVS.ECommerce.Application.DTOs.User;

public class CompanyProfileDto
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? LogoPath { get; set; }
    public string? Address { get; set; }
    public string UserId { get; set; } = string.Empty;
}