using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.Product;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class ReviewRepository : VendorBaseRepository<Review>, IReviewRepository
{
    public ReviewRepository(VendorDbContext context) : base(context) { }

    public async Task<IEnumerable<Review>> GetByProductIdAsync(int productId)
        => await _dbSet.Where(r => r.ProductId == productId && r.IsApproved).OrderByDescending(r => r.CreatedAt).ToListAsync();

    public async Task<IEnumerable<Review>> GetByUserIdAsync(string userId)
        => await _dbSet.Where(r => r.UserId == userId).OrderByDescending(r => r.CreatedAt).ToListAsync();

    public async Task<IEnumerable<Review>> GetPendingReviewsAsync()
        => await _dbSet.Where(r => !r.IsApproved).OrderBy(r => r.CreatedAt).ToListAsync();
}
