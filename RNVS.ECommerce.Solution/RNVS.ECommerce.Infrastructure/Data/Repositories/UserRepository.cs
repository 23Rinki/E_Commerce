using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using RNVS.ECommerce.Domain.Entities.User;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class UserRepository : BaseRepository<ApplicationUser>, IUserRepository
{
    public UserRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<ApplicationUser?> GetByEmailAsync(string email)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<ApplicationUser?> GetByUsernameAsync(string username)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.UserName == username);
    }

    public async Task<IEnumerable<ApplicationUser>> GetVendorsAsync()
    {
        return await _dbSet
            .Where(u => u.IsVendor && u.IsVendorApproved)
            .ToListAsync();
    }
}