using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace RNVS.ECommerce.Infrastructure.Security;

public class EncryptionService
{
    private readonly ILogger<EncryptionService> _logger;
    private readonly EncryptionOptions _options;

    public EncryptionService(
        ILogger<EncryptionService> logger,
        IOptions<EncryptionOptions> options)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));

        ValidateConfiguration();
    }

    private void ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_options.Key) || _options.Key.Length < 32)
        {
            throw new InvalidOperationException("Encryption key must be at least 32 characters long");
        }

        if (string.IsNullOrWhiteSpace(_options.IV) || _options.IV.Length < 16)
        {
            throw new InvalidOperationException("Encryption IV must be at least 16 characters long");
        }
    }

    public string Encrypt(string plainText)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(plainText))
            {
                _logger.LogWarning("Attempted to encrypt null or empty text");
                return string.Empty;
            }

            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(_options.Key.Substring(0, 32));
            aes.IV = Encoding.UTF8.GetBytes(_options.IV.Substring(0, 16));
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);

            using var memoryStream = new MemoryStream();
            using var cryptoStream = new CryptoStream(memoryStream, encryptor, CryptoStreamMode.Write);
            using (var streamWriter = new StreamWriter(cryptoStream))
            {
                streamWriter.Write(plainText);
            }

            var encrypted = memoryStream.ToArray();
            var result = Convert.ToBase64String(encrypted);

            _logger.LogDebug("Text encrypted successfully");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error encrypting text");
            throw;
        }
    }

    public string Decrypt(string cipherText)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(cipherText))
            {
                _logger.LogWarning("Attempted to decrypt null or empty cipher text");
                return string.Empty;
            }

            var buffer = Convert.FromBase64String(cipherText);

            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(_options.Key.Substring(0, 32));
            aes.IV = Encoding.UTF8.GetBytes(_options.IV.Substring(0, 16));
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);

            using var memoryStream = new MemoryStream(buffer);
            using var cryptoStream = new CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read);
            using var streamReader = new StreamReader(cryptoStream);

            var result = streamReader.ReadToEnd();

            _logger.LogDebug("Text decrypted successfully");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error decrypting text");
            throw;
        }
    }

    public string HashPassword(string password)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                throw new ArgumentException("Password cannot be null or empty");
            }

            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var hash = Convert.ToBase64String(hashedBytes);

            _logger.LogDebug("Password hashed successfully");
            return hash;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hashing password");
            throw;
        }
    }

    public bool VerifyPassword(string password, string hash)
    {
        try
        {
            var hashedPassword = HashPassword(password);
            return hashedPassword == hash;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying password");
            return false;
        }
    }

    public string GenerateSecureToken(int length = 32)
    {
        try
        {
            var randomBytes = new byte[length];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);

            var token = Convert.ToBase64String(randomBytes);
            _logger.LogDebug("Secure token generated");

            return token;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating secure token");
            throw;
        }
    }
}

public class EncryptionOptions
{
    public string Key { get; set; } = string.Empty;
    public string IV { get; set; } = string.Empty;
}