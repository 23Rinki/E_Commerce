namespace RNVS.ECommerce.Application.Interfaces.Services;

public interface IFileUploadService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string folder);
    Task<bool> DeleteFileAsync(string filePath);
    Task<byte[]> DownloadFileAsync(string filePath);
}