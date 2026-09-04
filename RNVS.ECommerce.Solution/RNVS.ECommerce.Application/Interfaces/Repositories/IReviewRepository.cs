using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface IReviewRepository : IBaseRepository<Review>
{
    Task<IEnumerable<Review>> GetByProductIdAsync(int productId);
    Task<IEnumerable<Review>> GetByUserIdAsync(string userId);
    Task<IEnumerable<Review>> GetPendingReviewsAsync();
}