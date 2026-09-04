namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IEmailService
{
    Task<bool> SendEmailAsync(string to, string subject, string body);
    Task<bool> SendOrderConfirmationAsync(int orderId);
    Task<bool> SendPasswordResetAsync(string email, string resetToken);
}