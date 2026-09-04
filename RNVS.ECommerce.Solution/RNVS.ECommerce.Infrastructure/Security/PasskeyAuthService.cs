using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text;

namespace RNVS.ECommerce.Infrastructure.Security;

public class PasskeyAuthService
{
    private readonly ILogger<PasskeyAuthService> _logger;
    private readonly IFido2 _fido2;
    private readonly PasskeyOptions _options;

    public PasskeyAuthService(
        ILogger<PasskeyAuthService> logger,
        IOptions<PasskeyOptions> options)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));

        var fido2Configuration = new Fido2Configuration
        {
            ServerDomain = _options.RelyingPartyId,
            ServerName = _options.RelyingPartyName,
            Origins = new HashSet<string> { _options.Origin },
            TimestampDriftTolerance = 300000
        };

        _fido2 = new Fido2(fido2Configuration);
        _logger.LogInformation("Passkey authentication service initialized for domain: {Domain}", _options.RelyingPartyId);
    }

    // Commented out due to API signature mismatch with Fido2NetLib
    /*
    public CredentialCreateOptions GenerateRegistrationOptions(string userId, string username, string displayName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(username))
            {
                throw new ArgumentException("UserId and username are required");
            }

            var user = new Fido2User
            {
                Id = Encoding.UTF8.GetBytes(userId),
                Name = username,
                DisplayName = displayName ?? username
            };

            var authenticatorSelection = new AuthenticatorSelection
            {
                RequireResidentKey = false,
                UserVerification = UserVerificationRequirement.Preferred,
                AuthenticatorAttachment = AuthenticatorAttachment.Platform
            };

            var exts = new AuthenticationExtensionsClientInputs
            {
                CredProps = true
            };

            var options = _fido2.RequestNewCredential(
                user,
                new List<PublicKeyCredentialDescriptor>(),
                authenticatorSelection,
                AttestationConveyancePreference.None,
                exts
            );

            _logger.LogInformation("Registration options generated for user: {UserId}", userId);
            return options;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating registration options for user: {UserId}", userId);
            throw;
        }
    }
    */

    // Commented out due to API signature mismatch with Fido2NetLib
    /*
    public async Task<PasskeyRegistrationResult> VerifyRegistrationAsync(
        AuthenticatorAttestationRawResponse attestationResponse,
        CredentialCreateOptions originalOptions)
    {
        try
        {
            if (attestationResponse == null || originalOptions == null)
            {
                throw new ArgumentException("Attestation response and original options are required");
            }

            var success = await _fido2.MakeNewCredentialAsync(
                attestationResponse,
                originalOptions,
                (args, cancellationToken) => Task.FromResult(true) // Credential ID uniqueness check
            );

            if (success.Result == null)
            {
                _logger.LogWarning("Passkey registration failed: {ErrorMessage}", success.ErrorMessage);
                return new PasskeyRegistrationResult
                {
                    Success = false,
                    Message = success.ErrorMessage ?? "Registration failed"
                };
            }

            _logger.LogInformation("Passkey registration successful");

            return new PasskeyRegistrationResult
            {
                Success = true,
                CredentialId = Convert.ToBase64String(success.Result.CredentialId),
                PublicKey = Convert.ToBase64String(success.Result.PublicKey),
                Counter = success.Result.Counter,
                CredType = success.Result.CredType,
                AaGuid = success.Result.AaGuid,
                Message = "Passkey registered successfully"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying passkey registration");
            return new PasskeyRegistrationResult
            {
                Success = false,
                Message = $"Error: {ex.Message}"
            };
        }
    }
    */

    // Commented out due to API signature mismatch with Fido2NetLib
    /*
    public AssertionOptions GenerateAuthenticationOptions(List<StoredPasskey> userPasskeys)
    {
        try
        {
            var allowedCredentials = userPasskeys.Select(passkey => new PublicKeyCredentialDescriptor
            {
                Id = Convert.FromBase64String(passkey.CredentialId),
                Type = PublicKeyCredentialType.PublicKey
            }).ToList();

            var exts = new AuthenticationExtensionsClientInputs();

            var options = _fido2.GetAssertionOptions(
                allowedCredentials,
                UserVerificationRequirement.Preferred,
                exts
            );

            _logger.LogInformation("Authentication options generated for {Count} passkeys", userPasskeys.Count);
            return options;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating authentication options");
            throw;
        }
    }
    */

    // Commented out due to API signature mismatch with Fido2NetLib
    /*
    public async Task<PasskeyAuthenticationResult> VerifyAuthenticationAsync(
        AuthenticatorAssertionRawResponse assertionResponse,
        AssertionOptions originalOptions,
        StoredPasskey storedPasskey)
    {
        try
        {
            if (assertionResponse == null || originalOptions == null || storedPasskey == null)
            {
                throw new ArgumentException("All parameters are required for authentication verification");
            }

            var credentialId = Convert.FromBase64String(storedPasskey.CredentialId);
            var publicKey = Convert.FromBase64String(storedPasskey.PublicKey);

            var res = await _fido2.MakeAssertionAsync(
                assertionResponse,
                originalOptions,
                publicKey,
                storedPasskey.Counter,
                args => Task.FromResult(true) // User handle validation
            );

            if (res.Status != "ok")
            {
                _logger.LogWarning("Passkey authentication failed: {ErrorMessage}", res.ErrorMessage);
                return new PasskeyAuthenticationResult
                {
                    Success = false,
                    Message = res.ErrorMessage ?? "Authentication failed"
                };
            }

            _logger.LogInformation("Passkey authentication successful for credential: {CredentialId}", storedPasskey.CredentialId);

            return new PasskeyAuthenticationResult
            {
                Success = true,
                NewCounter = res.Counter,
                UserId = storedPasskey.UserId,
                Message = "Authentication successful"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying passkey authentication");
            return new PasskeyAuthenticationResult
            {
                Success = false,
                Message = $"Error: {ex.Message}"
            };
        }
    }
    */

    public bool ValidatePasskeyCounter(uint storedCounter, uint newCounter)
    {
        if (newCounter <= storedCounter)
        {
            _logger.LogWarning("Passkey counter validation failed. Stored: {StoredCounter}, New: {NewCounter}",
                storedCounter, newCounter);
            return false;
        }

        return true;
    }
}

public class PasskeyOptions
{
    public string RelyingPartyId { get; set; } = "localhost";
    public string RelyingPartyName { get; set; } = "RNVS E-Commerce";
    public string Origin { get; set; } = "https://localhost:7001";
}

public class PasskeyRegistrationResult
{
    public bool Success { get; set; }
    public string? CredentialId { get; set; }
    public string? PublicKey { get; set; }
    public uint Counter { get; set; }
    public string? CredType { get; set; }
    public Guid AaGuid { get; set; }
    public string? Message { get; set; }
}

public class PasskeyAuthenticationResult
{
    public bool Success { get; set; }
    public uint NewCounter { get; set; }
    public string? UserId { get; set; }
    public string? Message { get; set; }
}

public class StoredPasskey
{
    public string UserId { get; set; } = string.Empty;
    public string CredentialId { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public uint Counter { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
}