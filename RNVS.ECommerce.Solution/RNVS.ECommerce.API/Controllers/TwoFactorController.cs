using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Infrastructure.Security;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/twofactor")]
public class TwoFactorController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly TwoFactorAuthService _twoFactorService;
    private readonly JwtTokenService _jwtTokenService;
    private readonly ILogger<TwoFactorController> _logger;

    public TwoFactorController(
        UserManager<ApplicationUser> userManager,
        TwoFactorAuthService twoFactorService,
        JwtTokenService jwtTokenService,
        ILogger<TwoFactorController> logger)
    {
        _userManager = userManager;
        _twoFactorService = twoFactorService;
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    /// <summary>Whether 2FA is currently enabled for the logged-in user.</summary>
    [HttpGet("status")]
    [Authorize]
    public async Task<IActionResult> GetStatus()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

        return Ok(new ApiResponseDto<object>
        {
            Success = true,
            Data = new { enabled = user.TwoFactorEnabled }
        });
    }

    /// <summary>
    /// Step 1 of enabling 2FA: generates a secret + QR code. Saves the secret on the user
    /// immediately but leaves TwoFactorEnabled = false until they prove they scanned it
    /// correctly via /enable — otherwise a generated-but-never-confirmed secret could lock
    /// the account out if the user lost the QR before saving it.
    /// </summary>
    [HttpPost("setup")]
    [Authorize]
    public async Task<IActionResult> Setup()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);
            if (user == null) return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            if (user.TwoFactorEnabled)
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Two-factor authentication is already enabled" });

            var secret = _twoFactorService.GenerateSecretKey();
            user.TwoFactorSecretKey = secret;
            await _userManager.UpdateAsync(user);

            var qrUri = _twoFactorService.GenerateQrCodeUri(user.Email!, secret);
            var qrImage = _twoFactorService.GenerateQrCodeImage(qrUri);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Data = new
                {
                    secretKey = secret,
                    qrCodeImageBase64 = Convert.ToBase64String(qrImage),
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting up 2FA");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    /// <summary>Step 2: confirms the user actually scanned the QR by submitting a live code, then turns 2FA on.</summary>
    [HttpPost("enable")]
    [Authorize]
    public async Task<IActionResult> Enable([FromBody] TwoFactorCodeDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);
            if (user == null) return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            if (string.IsNullOrEmpty(user.TwoFactorSecretKey))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Call /setup first to generate a secret" });

            if (!_twoFactorService.ValidateCode(user.TwoFactorSecretKey, dto.Code))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Invalid code" });

            user.TwoFactorEnabled = true;
            await _userManager.UpdateAsync(user);

            _logger.LogInformation("2FA enabled for user {UserId}", userId);

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Two-factor authentication enabled" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enabling 2FA");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    /// <summary>Disables 2FA — requires a currently-valid code, so a stolen session token alone can't turn it off.</summary>
    [HttpPost("disable")]
    [Authorize]
    public async Task<IActionResult> Disable([FromBody] TwoFactorCodeDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);
            if (user == null) return NotFound(new ApiResponseDto<object> { Success = false, Message = "User not found" });

            if (!user.TwoFactorEnabled || string.IsNullOrEmpty(user.TwoFactorSecretKey))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Two-factor authentication is not enabled" });

            if (!_twoFactorService.ValidateCode(user.TwoFactorSecretKey, dto.Code))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Invalid code" });

            user.TwoFactorEnabled = false;
            user.TwoFactorSecretKey = null;
            await _userManager.UpdateAsync(user);

            _logger.LogInformation("2FA disabled for user {UserId}", userId);

            return Ok(new ApiResponseDto<object> { Success = true, Message = "Two-factor authentication disabled" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disabling 2FA");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }

    /// <summary>
    /// Step 2 of login when the account has 2FA enabled: exchanges the pending token from
    /// /api/auth/login + a live authenticator code for a real, fully-privileged JWT.
    /// </summary>
    [HttpPost("verify-login")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyLogin([FromBody] TwoFactorLoginDto dto)
    {
        try
        {
            var userId = _jwtTokenService.ValidatePendingTwoFactorToken(dto.PendingToken);
            if (userId == null)
                return Unauthorized(new ApiResponseDto<object> { Success = false, Message = "Pending login has expired. Please log in again." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || !user.TwoFactorEnabled || string.IsNullOrEmpty(user.TwoFactorSecretKey))
                return Unauthorized(new ApiResponseDto<object> { Success = false, Message = "Invalid request" });

            if (!_twoFactorService.ValidateCode(user.TwoFactorSecretKey, dto.Code))
                return BadRequest(new ApiResponseDto<object> { Success = false, Message = "Invalid code" });

            var roles = new List<string> { user.Role.ToString() };
            var token = _jwtTokenService.GenerateToken(user.Id, user.Email!, roles);

            _logger.LogInformation("2FA login verified for user {UserId}", userId);

            return Ok(new
            {
                success = true,
                token = token.Token,
                refreshToken = token.RefreshToken,
                message = "Login successful"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying 2FA login");
            return StatusCode(500, new ApiResponseDto<object> { Success = false, Message = "Internal server error" });
        }
    }
}

public class TwoFactorCodeDto
{
    public string Code { get; set; } = string.Empty;
}

public class TwoFactorLoginDto
{
    public string PendingToken { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}
