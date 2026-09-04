using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OtpNet;
using QRCoder;
using System.Text;

namespace RNVS.ECommerce.Infrastructure.Security;

public class TwoFactorAuthService
{
    private readonly ILogger<TwoFactorAuthService> _logger;
    private readonly TwoFactorOptions _options;

    public TwoFactorAuthService(
        ILogger<TwoFactorAuthService> logger,
        IOptions<TwoFactorOptions> options)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
    }

    public string GenerateSecretKey()
    {
        try
        {
            var key = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(key);

            _logger.LogDebug("2FA secret key generated");
            return base32Secret;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating 2FA secret key");
            throw;
        }
    }

    public string GenerateQrCodeUri(string email, string secretKey)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(secretKey))
            {
                throw new ArgumentException("Email and secret key are required");
            }

            var issuer = Uri.EscapeDataString(_options.Issuer);
            var user = Uri.EscapeDataString(email);
            var secret = Uri.EscapeDataString(secretKey);

            var qrCodeUri = $"otpauth://totp/{issuer}:{user}?secret={secret}&issuer={issuer}";

            _logger.LogDebug("QR code URI generated for user: {Email}", email);
            return qrCodeUri;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating QR code URI for user: {Email}", email);
            throw;
        }
    }

    public byte[] GenerateQrCodeImage(string qrCodeUri)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(qrCodeUri))
            {
                throw new ArgumentException("QR code URI cannot be null or empty");
            }

            using var qrGenerator = new QRCodeGenerator();
            var qrCodeData = qrGenerator.CreateQrCode(qrCodeUri, QRCodeGenerator.ECCLevel.Q);

            using var qrCode = new PngByteQRCode(qrCodeData);
            var qrCodeImage = qrCode.GetGraphic(_options.QRCodeSize);

            _logger.LogDebug("QR code image generated");
            return qrCodeImage;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating QR code image");
            throw;
        }
    }

    public bool ValidateCode(string secretKey, string code)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(secretKey) || string.IsNullOrWhiteSpace(code))
            {
                _logger.LogWarning("Attempted to validate 2FA code with null or empty values");
                return false;
            }

            var secretBytes = Base32Encoding.ToBytes(secretKey);
            var totp = new Totp(secretBytes);

            var isValid = totp.VerifyTotp(code, out _, new VerificationWindow(2, 2));

            if (isValid)
            {
                _logger.LogDebug("2FA code validated successfully");
            }
            else
            {
                _logger.LogWarning("Invalid 2FA code provided");
            }

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating 2FA code");
            return false;
        }
    }

    public string GetCurrentCode(string secretKey)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(secretKey))
            {
                throw new ArgumentException("Secret key cannot be null or empty");
            }

            var secretBytes = Base32Encoding.ToBytes(secretKey);
            var totp = new Totp(secretBytes);
            var code = totp.ComputeTotp();

            _logger.LogDebug("Current 2FA code generated");
            return code;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current 2FA code");
            throw;
        }
    }

    public int GetRemainingSeconds()
    {
        var epoch = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var timeStep = 30; // TOTP standard time step
        var remaining = (int)(timeStep - (epoch % timeStep));

        return remaining;
    }
}

public class TwoFactorOptions
{
    public string Issuer { get; set; } = "RNVS E-Commerce";
    public int QRCodeSize { get; set; } = 20;
}