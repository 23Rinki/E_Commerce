using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.Interfaces.Repositories;
using PaymentEntity = RNVS.ECommerce.Domain.Entities.Payment.Payment;

namespace RNVS.ECommerce.Infrastructure.Data.Repositories;

public class PaymentRepository : VendorBaseRepository<PaymentEntity>, IPaymentRepository
{
    public PaymentRepository(VendorDbContext context) : base(context) { }

    public async Task<PaymentEntity?> GetByOrderIdAsync(int orderId)
        => await _dbSet.FirstOrDefaultAsync(p => p.OrderId == orderId);

    public async Task<PaymentEntity?> GetByTransactionIdAsync(string transactionId)
        => await _dbSet.FirstOrDefaultAsync(p => p.TransactionId == transactionId);
}
