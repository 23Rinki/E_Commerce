namespace RNVS.ECommerce.Infrastructure.SMS;

public interface ISmsService
{
    Task<bool> SendSmsAsync(string phoneNumber, string message);
    Task<bool> SendOtpAsync(string phoneNumber, string otp);
    Task<string> GenerateOtpAsync(string phoneNumber);
    Task<bool> VerifyOtpAsync(string phoneNumber, string otp);
}
