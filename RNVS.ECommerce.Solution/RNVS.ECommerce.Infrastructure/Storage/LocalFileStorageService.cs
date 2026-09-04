using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RNVS.ECommerce.Infrastructure.Storage.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using System.Net.Mime;

namespace RNVS.ECommerce.Infrastructure.Storage;

public class LocalFileStorageService : IFileStorageService
{
    private readonly ILogger<LocalFileStorageService> _logger;
    private readonly StorageOptions _options;
    private readonly string _rootPath;
    private readonly string _baseUrl;

    public LocalFileStorageService(
        ILogger<LocalFileStorageService> logger,
        IOptions<StorageOptions> options)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
        _rootPath = _options.Local.RootPath;
        _baseUrl = _options.Local.BaseUrl;

        // Ensure root directory exists
        if (!Directory.Exists(_rootPath))
        {
            Directory.CreateDirectory(_rootPath);
            _logger.LogInformation("Created storage root directory: {RootPath}", _rootPath);
        }
    }

    public async Task<FileUploadResult> UploadFileAsync(Stream fileStream, string fileName, string contentType, string folder = "")
    {
        try
        {
            if (fileStream == null || fileStream.Length == 0)
            {
                _logger.LogWarning("Attempted to upload empty file: {FileName}", fileName);
                return new FileUploadResult
                {
                    Success = false,
                    Message = "File is empty"
                };
            }

            // Validate file size
            var fileSizeInMB = fileStream.Length / (1024.0 * 1024.0);
            if (fileSizeInMB > _options.MaxFileSizeInMB)
            {
                _logger.LogWarning("File size {Size}MB exceeds maximum {MaxSize}MB: {FileName}",
                    fileSizeInMB, _options.MaxFileSizeInMB, fileName);
                return new FileUploadResult
                {
                    Success = false,
                    Message = $"File size exceeds maximum allowed size of {_options.MaxFileSizeInMB}MB"
                };
            }

            // Validate file extension
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            var allowedExtensions = _options.AllowedImageExtensions
                .Concat(_options.AllowedDocumentExtensions)
                .ToList();

            if (!allowedExtensions.Contains(extension))
            {
                _logger.LogWarning("File extension not allowed: {Extension} for file: {FileName}", extension, fileName);
                return new FileUploadResult
                {
                    Success = false,
                    Message = $"File extension {extension} is not allowed"
                };
            }

            // Generate unique filename
            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var folderPath = string.IsNullOrWhiteSpace(folder)
                ? _rootPath
                : Path.Combine(_rootPath, folder);

            // Ensure folder exists
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            var filePath = Path.Combine(folderPath, uniqueFileName);
            var relativePath = string.IsNullOrWhiteSpace(folder)
                ? uniqueFileName
                : Path.Combine(folder, uniqueFileName);

            // Save file
            using (var fileStreamOutput = new FileStream(filePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(fileStreamOutput);
            }

            var fileUrl = $"{_baseUrl}/{relativePath.Replace("\\", "/")}";

            _logger.LogInformation("File uploaded successfully: {FileName} to {FilePath}", fileName, filePath);

            return new FileUploadResult
            {
                Success = true,
                FilePath = relativePath,
                FileName = uniqueFileName,
                FileUrl = fileUrl,
                FileSize = fileStream.Length,
                ContentType = contentType,
                Message = "File uploaded successfully"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file: {FileName}", fileName);
            return new FileUploadResult
            {
                Success = false,
                Message = $"Error uploading file: {ex.Message}"
            };
        }
    }

    public async Task<FileUploadResult> UploadImageAsync(Stream imageStream, string fileName, string folder = "products")
    {
        try
        {
            if (imageStream == null || imageStream.Length == 0)
            {
                return new FileUploadResult
                {
                    Success = false,
                    Message = "Image is empty"
                };
            }

            var extension = Path.GetExtension(fileName).ToLowerInvariant();

            if (!_options.AllowedImageExtensions.Contains(extension))
            {
                return new FileUploadResult
                {
                    Success = false,
                    Message = $"Image extension {extension} is not allowed"
                };
            }

            // Generate unique filename and paths before loading the image
            var uniqueFileName = $"{Guid.NewGuid()}.jpg";
            var folderPath = Path.Combine(_rootPath, folder);

            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            var filePath = Path.Combine(folderPath, uniqueFileName);
            var relativePath = Path.Combine(folder, uniqueFileName);

            // Process and save image — dispose immediately after saving to release native memory
            using (var image = await Image.LoadAsync(imageStream))
            {
                if (image.Width > 1920)
                {
                    var ratio = 1920.0 / image.Width;
                    var newHeight = (int)(image.Height * ratio);
                    image.Mutate(x => x.Resize(1920, newHeight));
                }
                await image.SaveAsJpegAsync(filePath, new JpegEncoder { Quality = 85 });
            }

            var fileInfo = new FileInfo(filePath);
            var fileUrl = $"{_baseUrl}/{relativePath.Replace("\\", "/")}";

            _logger.LogInformation("Image uploaded and optimized: {FileName} to {FilePath}", fileName, filePath);

            return new FileUploadResult
            {
                Success = true,
                FilePath = relativePath,
                FileName = uniqueFileName,
                FileUrl = fileUrl,
                FileSize = fileInfo.Length,
                ContentType = "image/jpeg",
                Message = "Image uploaded successfully"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image: {FileName}", fileName);
            return new FileUploadResult
            {
                Success = false,
                Message = $"Error uploading image: {ex.Message}"
            };
        }
    }

    public async Task<byte[]?> DownloadFileAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                _logger.LogWarning("Attempted to download file with null or empty path");
                return null;
            }

            var fullPath = Path.Combine(_rootPath, filePath);

            if (!File.Exists(fullPath))
            {
                _logger.LogWarning("File not found: {FilePath}", fullPath);
                return null;
            }

            var fileBytes = await File.ReadAllBytesAsync(fullPath);
            _logger.LogDebug("File downloaded: {FilePath}", filePath);

            return fileBytes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading file: {FilePath}", filePath);
            return null;
        }
    }

    public Task<bool> DeleteFileAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                _logger.LogWarning("Attempted to delete file with null or empty path");
                return Task.FromResult(false);
            }

            var fullPath = Path.Combine(_rootPath, filePath);

            if (!File.Exists(fullPath))
            {
                _logger.LogWarning("File not found for deletion: {FilePath}", fullPath);
                return Task.FromResult(false);
            }

            File.Delete(fullPath);
            _logger.LogInformation("File deleted: {FilePath}", filePath);

            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {FilePath}", filePath);
            return Task.FromResult(false);
        }
    }

    public Task<string?> ArchiveFileAsync(string filePath, string archiveFolder)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                _logger.LogWarning("Attempted to archive file with null or empty path");
                return Task.FromResult<string?>(null);
            }

            var sourcePath = Path.Combine(_rootPath, filePath);
            if (!File.Exists(sourcePath))
            {
                _logger.LogWarning("File not found for archiving: {FilePath}", sourcePath);
                return Task.FromResult<string?>(null);
            }

            var newRelativePath = Path.Combine(archiveFolder, Path.GetFileName(filePath)).Replace('\\', '/');
            var destPath = Path.Combine(_rootPath, newRelativePath);

            Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
            File.Move(sourcePath, destPath, overwrite: true);

            _logger.LogInformation("File archived: {FilePath} -> {NewPath}", filePath, newRelativePath);
            return Task.FromResult<string?>(newRelativePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving file: {FilePath}", filePath);
            return Task.FromResult<string?>(null);
        }
    }

    public Task<bool> FileExistsAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return Task.FromResult(false);
            }

            var fullPath = Path.Combine(_rootPath, filePath);
            var exists = File.Exists(fullPath);

            return Task.FromResult(exists);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking file existence: {FilePath}", filePath);
            return Task.FromResult(false);
        }
    }

    public Task<string> GetFileUrlAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return Task.FromResult(string.Empty);
            }

            var fileUrl = $"{_baseUrl}/{filePath.Replace("\\", "/")}";
            return Task.FromResult(fileUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file URL: {FilePath}", filePath);
            return Task.FromResult(string.Empty);
        }
    }

    public Task<List<FileMetadata>> ListFilesAsync(string folder = "")
    {
        try
        {
            var folderPath = string.IsNullOrWhiteSpace(folder)
                ? _rootPath
                : Path.Combine(_rootPath, folder);

            if (!Directory.Exists(folderPath))
            {
                _logger.LogWarning("Folder not found: {FolderPath}", folderPath);
                return Task.FromResult(new List<FileMetadata>());
            }

            var files = Directory.GetFiles(folderPath)
                .Select(filePath =>
                {
                    var fileInfo = new FileInfo(filePath);
                    var relativePath = Path.GetRelativePath(_rootPath, filePath);

                    return new FileMetadata
                    {
                        FileName = fileInfo.Name,
                        FilePath = relativePath,
                        FileSize = fileInfo.Length,
                        ContentType = GetContentType(fileInfo.Extension),
                        CreatedAt = fileInfo.CreationTimeUtc,
                        ModifiedAt = fileInfo.LastWriteTimeUtc
                    };
                })
                .ToList();

            _logger.LogDebug("Listed {Count} files in folder: {Folder}", files.Count, folder);
            return Task.FromResult(files);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing files in folder: {Folder}", folder);
            return Task.FromResult(new List<FileMetadata>());
        }
    }

    public Task<long> GetFileSizeAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return Task.FromResult(0L);
            }

            var fullPath = Path.Combine(_rootPath, filePath);

            if (!File.Exists(fullPath))
            {
                _logger.LogWarning("File not found: {FilePath}", fullPath);
                return Task.FromResult(0L);
            }

            var fileInfo = new FileInfo(fullPath);
            return Task.FromResult(fileInfo.Length);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file size: {FilePath}", filePath);
            return Task.FromResult(0L);
        }
    }

    private string GetContentType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".svg" => "image/svg+xml",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            _ => "application/octet-stream"
        };
    }
}