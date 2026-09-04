using RNVS.ECommerce.Infrastructure.Storage.Models;

namespace RNVS.ECommerce.Infrastructure.Storage;

public interface IFileStorageService
{
    Task<FileUploadResult> UploadFileAsync(Stream fileStream, string fileName, string contentType, string folder = "");
    Task<FileUploadResult> UploadImageAsync(Stream imageStream, string fileName, string folder = "products");
    Task<byte[]?> DownloadFileAsync(string filePath);
    Task<bool> DeleteFileAsync(string filePath);
    /// <summary>Moves a file into an archive folder instead of deleting it. Returns the new path, or null on failure.</summary>
    Task<string?> ArchiveFileAsync(string filePath, string archiveFolder);
    Task<bool> FileExistsAsync(string filePath);
    Task<string> GetFileUrlAsync(string filePath);
    Task<List<FileMetadata>> ListFilesAsync(string folder = "");
    Task<long> GetFileSizeAsync(string filePath);
}