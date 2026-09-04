using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace RNVS.ECommerce.Infrastructure.SMS;

public class TwilioSmsService : ISmsService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TwilioSmsService> _logger;
    private readonly IMemoryCache _cache;

    public TwilioSmsService(
        IConfiguration configuration,
        ILogger<TwilioSmsService> logger,
        IMemoryCache cache)
    {
        _configuration = configuration;
        _logger = logger;
        _cache = cache;
    }

    public async Task<bool> SendSmsAsync(string phoneNumber, string message)
    {
        var accountSid = _configuration["Twilio:AccountSid"];
        var apiKeySid = _configuration["Twilio:ApiKeySid"];
        var apiKeySecret = _configuration["Twilio:ApiKeySecret"];
        var fromNumber = _configuration["Twilio:FromPhoneNumber"];
        var senderId = _configuration["Twilio:SenderId"];

        TwilioClient.Init(apiKeySid, apiKeySecret, accountSid);

        // Prefer the registered alphanumeric sender ID (shows "RNVS EComm" instead of a raw number).
        // Falls back to the phone number automatically if the sender ID isn't approved yet for the
        // destination country, or isn't supported there at all (e.g. US/Canada never allow it).
        if (!string.IsNullOrEmpty(senderId) && await TrySendAsync(senderId, phoneNumber, message))
            return true;

        return await TrySendAsync(fromNumber, phoneNumber, message);
    }

    private async Task<bool> TrySendAsync(string? from, string phoneNumber, string message)
    {
        try
        {
            var result = await MessageResource.CreateAsync(
                body: message,
                from: new PhoneNumber(from),
                to: new PhoneNumber(phoneNumber)
            );

            _logger.LogInformation("SMS to {PhoneNumber} from {From} — Twilio status: {Status}", phoneNumber, from, result.Status);

            return result.Status != MessageResource.StatusEnum.Failed
                && result.Status != MessageResource.StatusEnum.Undelivered;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SMS send from {From} to {PhoneNumber} failed", from, phoneNumber);
            return false;
        }
    }

    public async Task<bool> SendOtpAsync(string phoneNumber, string otp)
    {
        var message = $"Your OTP is: {otp}. Valid for 5 minutes. Do not share with anyone.";
        return await SendSmsAsync(phoneNumber, message);
    }

    public async Task<string> GenerateOtpAsync(string phoneNumber)
    {
        // Generate 6-digit OTP
        var random = new Random();
        var otp = random.Next(100000, 999999).ToString();

        // Store OTP in cache for 5 minutes
        var cacheKey = $"otp_{phoneNumber}";
        _cache.Set(cacheKey, otp, TimeSpan.FromMinutes(5));

        _logger.LogInformation($"Generated OTP for {phoneNumber}: {otp}");

        // Send OTP via SMS
        await SendOtpAsync(phoneNumber, otp);

        return otp; // Return for testing, remove in production
    }

    public async Task<bool> VerifyOtpAsync(string phoneNumber, string otp)
    {
        var cacheKey = $"otp_{phoneNumber}";

        if (_cache.TryGetValue(cacheKey, out string? storedOtp))
        {
            if (storedOtp == otp)
            {
                // Remove OTP after successful verification
                _cache.Remove(cacheKey);
                _logger.LogInformation($"OTP verified successfully for {phoneNumber}");
                return await Task.FromResult(true);
            }
        }

        _logger.LogWarning($"OTP verification failed for {phoneNumber}");
        return await Task.FromResult(false);
    }
}
