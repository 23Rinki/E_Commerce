namespace RNVS.ECommerce.Domain.Exceptions;

public class UnauthorizedVendorException : DomainException
{
    public UnauthorizedVendorException(string vendorId)
        : base($"Vendor {vendorId} is not authorized to perform this operation.")
    {
    }
}           