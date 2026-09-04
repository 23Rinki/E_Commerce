namespace RNVS.ECommerce.Domain.Exceptions;

public class InsufficientStockException : DomainException
{
    public InsufficientStockException(int productId, int requestedQuantity, int availableQuantity)
        : base($"Insufficient stock for product {productId}. Requested: {requestedQuantity}, Available: {availableQuantity}")
    {
    }

    public InsufficientStockException(string message) : base(message)
    {
    }
}