namespace RNVS.ECommerce.Infrastructure.Security.Models;

public class AuthResult
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, string> Errors { get; set; } = new();
}

public class TokenValidationResult
{
    public bool IsValid { get; set; }
    public string? UserId { get; set; }
    public string? Email { get; set; }
    public List<string> Roles { get; set; } = new();
    public string? Message { get; set; }
}

public class RefreshTokenRequest
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
}