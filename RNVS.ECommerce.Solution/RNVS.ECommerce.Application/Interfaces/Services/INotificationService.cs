namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface INotificationService
{
    Task SendNotificationAsync(string userId, string message);
    Task SendOrderStatusUpdateAsync(int orderId, string status);
}