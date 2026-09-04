using RNVS.ECommerce.Domain.Entities.User;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface IUserRepository : IBaseRepository<ApplicationUser>
{
    Task<ApplicationUser?> GetByEmailAsync(string email);
    Task<ApplicationUser?> GetByUsernameAsync(string username);
    Task<IEnumerable<ApplicationUser>> GetVendorsAsync();
}