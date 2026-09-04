using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Analytics;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class UserBehaviorRepository : VendorBaseRepository<UserBehavior>, IUserBehaviorRepository
{
    public UserBehaviorRepository(VendorDbContext context) : base(context) { }

    public async Task<IEnumerable<UserBehavior>> GetByUserIdAsync(string userId, int limit = 100)
        => await _dbSet.Where(ub => ub.UserId == userId).OrderByDescending(ub => ub.CreatedAt).Take(limit).ToListAsync();

    public async Task<IEnumerable<UserBehavior>> GetBySessionIdAsync(string sessionId)
        => await _dbSet.Where(ub => ub.SessionId == sessionId).OrderByDescending(ub => ub.CreatedAt).ToListAsync();

    public async Task<IEnumerable<UserBehavior>> GetByEventTypeAsync(UserEventType eventType, int limit = 100)
        => await _dbSet.Where(ub => ub.EventType == eventType).OrderByDescending(ub => ub.CreatedAt).Take(limit).ToListAsync();

    public async Task<IEnumerable<UserBehavior>> GetProductViewsByUserIdAsync(string userId, int limit = 50)
        => await _dbSet
            .Where(ub => ub.UserId == userId && ub.EventType == UserEventType.ProductView && ub.ProductId.HasValue)
            .OrderByDescending(ub => ub.CreatedAt).Take(limit).ToListAsync();

    public async Task<IEnumerable<UserBehavior>> GetRecentProductViewsAsync(int productId, int limit = 100)
        => await _dbSet
            .Where(ub => ub.ProductId == productId && ub.EventType == UserEventType.ProductView)
            .OrderByDescending(ub => ub.CreatedAt).Take(limit).ToListAsync();

    public async Task<bool> HasUserViewedProductAsync(string userId, int productId)
        => await _dbSet.AnyAsync(ub => ub.UserId == userId && ub.ProductId == productId && ub.EventType == UserEventType.ProductView);

    public async Task<int> GetProductViewCountAsync(int productId, DateTime? since = null)
    {
        var query = _dbSet.Where(ub => ub.ProductId == productId && ub.EventType == UserEventType.ProductView);
        if (since.HasValue) query = query.Where(ub => ub.CreatedAt >= since.Value);
        return await query.CountAsync();
    }
}
