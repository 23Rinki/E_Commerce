namespace RNVS.ECommerce.Infrastructure.PDF;

public interface IPdfGenerator
{
    Task<byte[]> GeneratePdfAsync(string htmlContent);
    Task<string> GeneratePdfAndSaveAsync(byte[] pdfBytes, string fileName);
}