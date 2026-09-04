using RNVS.ECommerce.Domain.Entities.Payment;

namespace RNVS.ECommerce.Application.Interfaces.Repositories;

public interface IPaymentRepository : IBaseRepository<Payment>
{
    Task<Payment?> GetByOrderIdAsync(int orderId);
    Task<Payment?> GetByTransactionIdAsync(string transactionId);
}