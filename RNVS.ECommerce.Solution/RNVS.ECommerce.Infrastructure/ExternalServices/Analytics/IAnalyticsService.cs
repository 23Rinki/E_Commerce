namespace RNVS.ECommerce.Infrastructure.ExternalServices.Analytics;

public interface IAnalyticsService
{
    Task TrackPageViewAsync(string pageUrl, string userId);
    Task TrackEventAsync(string eventName, Dictionary<string, string> properties);
    Task TrackPurchaseAsync(string orderId, decimal amount, string userId);
    string ServiceName { get; }
}