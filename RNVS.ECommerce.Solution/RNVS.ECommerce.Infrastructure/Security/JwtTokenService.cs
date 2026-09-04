using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using RNVS.ECommerce.Infrastructure.Security.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace RNVS.ECommerce.Infrastructure.Security;

public class JwtTokenService
{
    private readonly ILogger<JwtTokenService> _logger;
    private readonly JwtSettings _jwtSettings;
    private readonly TokenValidationParameters _tokenValidationParameters;

    public JwtTokenService(
        ILogger<JwtTokenService> logger,
        IOptions<JwtSettings> jwtSettings)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _jwtSettings = jwtSettings.Value ?? throw new ArgumentNullException(nameof(jwtSettings));

        _tokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _jwtSettings.Issuer,
            ValidAudience = _jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey)),
            ClockSkew = TimeSpan.Zero
        };
    }

    /// <summary>Generate JWT for vendors and customers (backed by ASP.NET Identity).</summary>
    public AuthResult GenerateToken(string userId, string email, List<string> roles)
        => GenerateToken(userId, email, roles, null);

    /// <summary>
    /// Generate JWT with optional extra claims.
    /// Used for employee tokens which carry vendorid + designation claims.
    /// </summary>
    public AuthResult GenerateToken(string userId, string email, List<string> roles, IEnumerable<Claim>? extraClaims)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(email))
            {
                _logger.LogWarning("Attempted to generate token with invalid userId or email");
                return new AuthResult { Success = false, Message = "Invalid user credentials" };
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Email, email),
                new Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub, userId),
                new Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email, email),
                new Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())
            };

            foreach (var role in roles)
                claims.Add(new Claim(ClaimTypes.Role, role));

            if (extraClaims != null)
                claims.AddRange(extraClaims);

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes);

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: expiresAt,
                signingCredentials: credentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            _logger.LogInformation("JWT token generated for user: {UserId}", userId);

            return new AuthResult
            {
                Success = true,
                Token = tokenString,
                RefreshToken = GenerateRefreshToken(),
                ExpiresAt = expiresAt,
                Message = "Token generated successfully"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating JWT token for user: {UserId}", userId);
            return new AuthResult { Success = false, Message = $"Error generating token: {ex.Message}" };
        }
    }

    /// <summary>
    /// A short-lived (5 min), role-less token issued after password verification when the
    /// account has 2FA enabled. It only carries enough identity to be exchanged for a real
    /// token at /api/auth/2fa/verify — it cannot be used against any [Authorize] endpoint,
    /// since RequireRole/RequireAccess checks all key off the Role claim, which this token omits.
    /// </summary>
    public string GeneratePendingTwoFactorToken(string userId)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim("purpose", "2fa-pending"),
            new Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Validates a pending-2FA token and returns the userId claim, or null if invalid/expired/wrong purpose.</summary>
    public string? ValidatePendingTwoFactorToken(string token)
    {
        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(token, _tokenValidationParameters, out _);
            var purpose = principal.FindFirst("purpose")?.Value;
            if (purpose != "2fa-pending") return null;
            return principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
        catch
        {
            return null;
        }
    }

    public Models.TokenValidationResult ValidateToken(string token)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(token))
                return new Models.TokenValidationResult { IsValid = false, Message = "Token is empty" };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, _tokenValidationParameters, out var validatedToken);

            var jwtToken = validatedToken as JwtSecurityToken;
            if (jwtToken == null ||
                !jwtToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                return new Models.TokenValidationResult { IsValid = false, Message = "Invalid token algorithm" };

            var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = principal.FindFirst(ClaimTypes.Email)?.Value;
            var roles = principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

            _logger.LogDebug("Token validated successfully for user: {UserId}", userId);

            return new Models.TokenValidationResult
            {
                IsValid = true, UserId = userId, Email = email, Roles = roles, Message = "Token is valid"
            };
        }
        catch (SecurityTokenExpiredException)
        {
            _logger.LogWarning("Token has expired");
            return new Models.TokenValidationResult { IsValid = false, Message = "Token has expired" };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating token");
            return new Models.TokenValidationResult { IsValid = false, Message = $"Invalid token: {ex.Message}" };
        }
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        try
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = false,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _jwtSettings.Issuer,
                ValidAudience = _jwtSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey)),
                ClockSkew = TimeSpan.Zero
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);

            var jwtSecurityToken = securityToken as JwtSecurityToken;
            if (jwtSecurityToken == null ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                return null;

            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting principal from expired token");
            return null;
        }
    }
}
