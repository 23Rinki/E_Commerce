using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RNVS.ECommerce.Infrastructure.Storage.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using System.Net.Mime;

namespace RNVS.ECommerce.Infrastructure.Storage;

public class AzureBlobStorageService : IFileStorageService
{
    private readonly ILogger<AzureBlobStorageService> _logger;
    private readonly StorageOptions _options;
    private readonly BlobServiceClient _blobServiceClient;
    private readonly BlobContainerClient _containerClient;

    public AzureBlobStorageService(
        ILogger<AzureBlobStorageService> logger,
        IOptions<StorageOptions> options)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));

        if (string.IsNullOrWhiteSpace(_options.Azure.ConnectionString))
        {
            throw new InvalidOperationException("Azure Storage connection string is not configured");
        }

        _blobServiceClient = new BlobServiceClient(_options.Azure.ConnectionString);
        _containerClient = _blobServiceClient.GetBlobContainerClient(_options.Azure.ContainerName);

        // Create container if it doesn't exist
        _containerClient.CreateIfNotExists(PublicAccessType.Blob);
        _logger.LogInformation("Azure Blob Storage initialized with container: {ContainerName}", _options.Azure.ContainerName);
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
            var blobName = string.IsNullOrWhiteSpace(folder)
                ? uniqueFileName
                : $"{folder}/{uniqueFileName}";

            // Get blob client
            var blobClient = _containerClient.GetBlobClient(blobName);

            // Set content type
            var blobHttpHeaders = new BlobHttpHeaders
            {
                ContentType = contentType
            };

            // Upload file
            fileStream.Position = 0;
            await blobClient.UploadAsync(fileStream, new BlobUploadOptions
            {
                HttpHeaders = blobHttpHeaders
            });

            var fileUrl = blobClient.Uri.ToString();

            _logger.LogInformation("File uploaded to Azure Blob Storage: {FileName} as {BlobName}", fileName, blobName);

            return new FileUploadResult
            {
                Success = true,
                FilePath = blobName,
                FileName = uniqueFileName,
                FileUrl = fileUrl,
                FileSize = fileStream.Length,
                ContentType = contentType,
                Message = "File uploaded successfully"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to Azure Blob Storage: {FileName}", fileName);
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

            // Optimize image using ImageSharp
            using var image = await Image.LoadAsync(imageStream);

            // Resize if too large (max 1920px width)
            if (image.Width > 1920)
            {
                var ratio = 1920.0 / image.Width;
                var newHeight = (int)(image.Height * ratio);
                image.Mutate(x => x.Resize(1920, newHeight));
            }

            // Generate unique filename
            var uniqueFileName = $"{Guid.NewGuid()}.jpg"; // Convert all to jpg
            var blobName = $"{folder}/{uniqueFileName}";

            // Get blob client
            var blobClient = _containerClient.GetBlobClient(blobName);

            // Save optimized image to memory stream
            using var optimizedStream = new MemoryStream();
            await image.SaveAsJpegAsync(optimizedStream, new JpegEncoder { Quality = 85 });
            optimizedStream.Position = 0;

            // Set content type
            var blobHttpHeaders = new BlobHttpHeaders
            {
                ContentType = "image/jpeg"
            };

            // Upload to Azure
            await blobClient.UploadAsync(optimizedStream, new BlobUploadOptions
            {
                HttpHeaders = blobHttpHeaders
            });

            var fileUrl = blobClient.Uri.ToString();

            _logger.LogInformation("Image uploaded and optimized to Azure Blob Storage: {FileName} as {BlobName}", fileName, blobName);

            return new FileUploadResult
            {
                Success = true,
                FilePath = blobName,
                FileName = uniqueFileName,
                FileUrl = fileUrl,
                FileSize = optimizedStream.Length,
                ContentType = "image/jpeg",
                Message = "Image uploaded successfully"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image to Azure Blob Storage: {FileName}", fileName);
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

            var blobClient = _containerClient.GetBlobClient(filePath);

            if (!await blobClient.ExistsAsync())
            {
                _logger.LogWarning("Blob not found: {FilePath}", filePath);
                return null;
            }

            using var memoryStream = new MemoryStream();
            await blobClient.DownloadToAsync(memoryStream);

            _logger.LogDebug("File downloaded from Azure Blob Storage: {FilePath}", filePath);

            return memoryStream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading file from Azure Blob Storage: {FilePath}", filePath);
            return null;
        }
    }

    public async Task<bool> DeleteFileAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                _logger.LogWarning("Attempted to delete file with null or empty path");
                return false;
            }

            var blobClient = _containerClient.GetBlobClient(filePath);

            if (!await blobClient.ExistsAsync())
            {
                _logger.LogWarning("Blob not found for deletion: {FilePath}", filePath);
                return false;
            }

            await blobClient.DeleteAsync();
            _logger.LogInformation("File deleted from Azure Blob Storage: {FilePath}", filePath);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file from Azure Blob Storage: {FilePath}", filePath);
            return false;
        }
    }

    public async Task<string?> ArchiveFileAsync(string filePath, string archiveFolder)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                _logger.LogWarning("Attempted to archive file with null or empty path");
                return null;
            }

            var sourceClient = _containerClient.GetBlobClient(filePath);
            if (!await sourceClient.ExistsAsync())
            {
                _logger.LogWarning("Blob not found for archiving: {FilePath}", filePath);
                return null;
            }

            var newPath = $"{archiveFolder.TrimEnd('/')}/{Path.GetFileName(filePath)}";
            var destClient = _containerClient.GetBlobClient(newPath);

            await destClient.StartCopyFromUriAsync(sourceClient.Uri);
            await sourceClient.DeleteAsync();

            _logger.LogInformation("Blob archived: {FilePath} -> {NewPath}", filePath, newPath);
            return newPath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving file in Azure Blob Storage: {FilePath}", filePath);
            return null;
        }
    }

    public async Task<bool> FileExistsAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return false;
            }

            var blobClient = _containerClient.GetBlobClient(filePath);
            var exists = await blobClient.ExistsAsync();

            return exists.Value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking file existence in Azure Blob Storage: {FilePath}", filePath);
            return false;
        }
    }

    public async Task<string> GetFileUrlAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return string.Empty;
            }

            var blobClient = _containerClient.GetBlobClient(filePath);

            if (!await blobClient.ExistsAsync())
            {
                _logger.LogWarning("Blob not found: {FilePath}", filePath);
                return string.Empty;
            }

            return blobClient.Uri.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file URL from Azure Blob Storage: {FilePath}", filePath);
            return string.Empty;
        }
    }

    public async Task<List<FileMetadata>> ListFilesAsync(string folder = "")
    {
        try
        {
            var files = new List<FileMetadata>();
            var prefix = string.IsNullOrWhiteSpace(folder) ? null : $"{folder}/";

            await foreach (var blobItem in _containerClient.GetBlobsAsync(prefix: prefix))
            {
                var blobClient = _containerClient.GetBlobClient(blobItem.Name);
                var properties = await blobClient.GetPropertiesAsync();

                files.Add(new FileMetadata
                {
                    FileName = Path.GetFileName(blobItem.Name),
                    FilePath = blobItem.Name,
                    FileSize = blobItem.Properties.ContentLength ?? 0,
                    ContentType = properties.Value.ContentType,
                    CreatedAt = blobItem.Properties.CreatedOn?.UtcDateTime ?? DateTime.UtcNow,
                    ModifiedAt = blobItem.Properties.LastModified?.UtcDateTime
                });
            }

            _logger.LogDebug("Listed {Count} files in Azure Blob Storage folder: {Folder}", files.Count, folder);
            return files;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing files in Azure Blob Storage folder: {Folder}", folder);
            return new List<FileMetadata>();
        }
    }

    public async Task<long> GetFileSizeAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return 0L;
            }

            var blobClient = _containerClient.GetBlobClient(filePath);

            if (!await blobClient.ExistsAsync())
            {
                _logger.LogWarning("Blob not found: {FilePath}", filePath);
                return 0L;
            }

            var properties = await blobClient.GetPropertiesAsync();
            return properties.Value.ContentLength;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file size from Azure Blob Storage: {FilePath}", filePath);
            return 0L;
        }
    }
}