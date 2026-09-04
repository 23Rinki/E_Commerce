namespace RNVS.ECommerce.Domain.Exceptions;

public class ProductNotFoundException : DomainException
{
    public ProductNotFoundException(int productId)
        : base($"Product with ID {productId} was not found.")
    {
    }

    public ProductNotFoundException(string message) : base(message)
    {
    }
}