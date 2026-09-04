namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IInventoryService
{
    Task<int> GetAvailableStockAsync(int productId);
    Task<bool> ReserveStockAsync(int productId, int quantity);
    Task<bool> ReleaseStockAsync(int productId, int quantity);
    Task<bool> UpdateStockAsync(int productId, int quantity);
}