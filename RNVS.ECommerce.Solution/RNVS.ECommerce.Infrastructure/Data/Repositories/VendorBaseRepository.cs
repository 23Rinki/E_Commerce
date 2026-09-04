using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using System.Linq.Expressions;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

/// <summary>
/// Base repository for all vendor-specific data.
/// Uses VendorDbContext which connects to the tenant's isolated database.
/// </summary>
public class VendorBaseRepository<T> : IBaseRepository<T> where T : class
{
    protected readonly VendorDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public VendorBaseRepository(VendorDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(int id) => await _dbSet.FindAsync(id);

    public async Task<IEnumerable<T>> GetAllAsync() => await _dbSet.ToListAsync();

    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
        => await _dbSet.Where(predicate).ToListAsync();

    public async Task<T> AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id)
        => await _dbSet.FindAsync(id) != null;
}
