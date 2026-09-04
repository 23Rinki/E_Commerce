namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IReceiptService
{
    Task<byte[]> GenerateReceiptPdfAsync(int orderId);
    Task<bool> EmailReceiptAsync(int orderId, string email);
    Task<bool> UpdateReceiptBrandingAsync(string vendorId, int templateId);
}