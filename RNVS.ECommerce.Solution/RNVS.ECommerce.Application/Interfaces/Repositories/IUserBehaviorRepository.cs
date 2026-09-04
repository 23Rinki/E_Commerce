using RNVS.ECommerce.Domain.Entities.Analytics;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface IUserBehaviorRepository : IBaseRepository<UserBehavior>
{
    Task<IEnumerable<UserBehavior>> GetByUserIdAsync(string userId, int limit = 100);
    Task<IEnumerable<UserBehavior>> GetBySessionIdAsync(string sessionId);
    Task<IEnumerable<UserBehavior>> GetByEventTypeAsync(UserEventType eventType, int limit = 100);
    Task<IEnumerable<UserBehavior>> GetProductViewsByUserIdAsync(string userId, int limit = 50);
    Task<IEnumerable<UserBehavior>> GetRecentProductViewsAsync(int productId, int limit = 100);
    Task<bool> HasUserViewedProductAsync(string userId, int productId);
    Task<int> GetProductViewCountAsync(int productId, DateTime? since = null);
}
