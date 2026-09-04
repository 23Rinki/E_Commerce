using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RNVS.ECommerce.Infrastructure.Storage.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;

namespace RNVS.ECommerce.Infrastructure.Storage;

public class S3FileStorageService : IFileStorageService
{
    private readonly ILogger<S3FileStorageService> _logger;
    private readonly StorageOptions _options;
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public S3FileStorageService(
        ILogger<S3FileStorageService> logger,
        IOptions<StorageOptions> options)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));

        if (string.IsNullOrWhiteSpace(_options.AWS.AccessKey) ||
            string.IsNullOrWhiteSpace(_options.AWS.SecretKey))
        {
            throw new InvalidOperationException("AWS credentials are not configured");
        }

        var config = new AmazonS3Config
        {
            RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(_options.AWS.Region)
        };

        _s3Client = new AmazonS3Client(_options.AWS.AccessKey, _options.AWS.SecretKey, config);
        _bucketName = _options.AWS.BucketName;

        _logger.LogInformation("AWS S3 Storage initialized with bucket: {BucketName} in region: {Region}",
            _bucketName, _options.AWS.Region);
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
            var s3Key = string.IsNullOrWhiteSpace(folder)
                ? uniqueFileName
                : $"{folder}/{uniqueFileName}";

            // Create transfer utility
            var transferUtility = new TransferUtility(_s3Client);

            // Upload request
            var uploadRequest = new TransferUtilityUploadRequest
            {
                InputStream = fileStream,
                Key = s3Key,
                BucketName = _bucketName,
                ContentType = contentType,
                CannedACL = S3CannedACL.PublicRead
            };

            // Upload file
            fileStream.Position = 0;
            await transferUtility.UploadAsync(uploadRequest);

            var fileUrl = $"{_options.AWS.BaseUrl}/{_bucketName}/{s3Key}";

            _logger.LogInformation("File uploaded to AWS S3: {FileName} as {S3Key}", fileName, s3Key);

            return new FileUploadResult
            {
                Success = true,
                FilePath = s3Key,
                FileName = uniqueFileName,
                FileUrl = fileUrl,
                FileSize = fileStream.Length,
                ContentType = contentType,
                Message = "File uploaded successfully"
            };
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogError(ex, "AWS S3 error uploading file: {FileName}. Error Code: {ErrorCode}",
                fileName, ex.ErrorCode);
            return new FileUploadResult
            {
                Success = false,
                Message = $"AWS S3 error: {ex.Message}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to AWS S3: {FileName}", fileName);
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
            var s3Key = $"{folder}/{uniqueFileName}";

            // Save optimized image to memory stream
            using var optimizedStream = new MemoryStream();
            await image.SaveAsJpegAsync(optimizedStream, new JpegEncoder { Quality = 85 });
            optimizedStream.Position = 0;

            // Create transfer utility
            var transferUtility = new TransferUtility(_s3Client);

            // Upload request
            var uploadRequest = new TransferUtilityUploadRequest
            {
                InputStream = optimizedStream,
                Key = s3Key,
                BucketName = _bucketName,
                ContentType = "image/jpeg",
                CannedACL = S3CannedACL.PublicRead
            };

            // Upload to S3
            await transferUtility.UploadAsync(uploadRequest);

            var fileUrl = $"{_options.AWS.BaseUrl}/{_bucketName}/{s3Key}";

            _logger.LogInformation("Image uploaded and optimized to AWS S3: {FileName} as {S3Key}", fileName, s3Key);

            return new FileUploadResult
            {
                Success = true,
                FilePath = s3Key,
                FileName = uniqueFileName,
                FileUrl = fileUrl,
                FileSize = optimizedStream.Length,
                ContentType = "image/jpeg",
                Message = "Image uploaded successfully"
            };
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogError(ex, "AWS S3 error uploading image: {FileName}. Error Code: {ErrorCode}",
                fileName, ex.ErrorCode);
            return new FileUploadResult
            {
                Success = false,
                Message = $"AWS S3 error: {ex.Message}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image to AWS S3: {FileName}", fileName);
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

            var request = new GetObjectRequest
            {
                BucketName = _bucketName,
                Key = filePath
            };

            using var response = await _s3Client.GetObjectAsync(request);
            using var memoryStream = new MemoryStream();
            await response.ResponseStream.CopyToAsync(memoryStream);

            _logger.LogDebug("File downloaded from AWS S3: {FilePath}", filePath);

            return memoryStream.ToArray();
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("File not found in AWS S3: {FilePath}", filePath);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading file from AWS S3: {FilePath}", filePath);
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

            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = filePath
            };

            await _s3Client.DeleteObjectAsync(deleteRequest);
            _logger.LogInformation("File deleted from AWS S3: {FilePath}", filePath);

            return true;
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogError(ex, "AWS S3 error deleting file: {FilePath}. Error Code: {ErrorCode}",
                filePath, ex.ErrorCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file from AWS S3: {FilePath}", filePath);
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

            var newKey = $"{archiveFolder.TrimEnd('/')}/{Path.GetFileName(filePath)}";

            await _s3Client.CopyObjectAsync(new CopyObjectRequest
            {
                SourceBucket = _bucketName,
                SourceKey = filePath,
                DestinationBucket = _bucketName,
                DestinationKey = newKey
            });

            await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = filePath
            });

            _logger.LogInformation("S3 object archived: {FilePath} -> {NewPath}", filePath, newKey);
            return newKey;
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogError(ex, "AWS S3 error archiving file: {FilePath}. Error Code: {ErrorCode}",
                filePath, ex.ErrorCode);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving file in AWS S3: {FilePath}", filePath);
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

            var request = new GetObjectMetadataRequest
            {
                BucketName = _bucketName,
                Key = filePath
            };

            await _s3Client.GetObjectMetadataAsync(request);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking file existence in AWS S3: {FilePath}", filePath);
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

            var exists = await FileExistsAsync(filePath);
            if (!exists)
            {
                _logger.LogWarning("File not found in AWS S3: {FilePath}", filePath);
                return string.Empty;
            }

            var fileUrl = $"{_options.AWS.BaseUrl}/{_bucketName}/{filePath}";
            return fileUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file URL from AWS S3: {FilePath}", filePath);
            return string.Empty;
        }
    }

    public async Task<List<FileMetadata>> ListFilesAsync(string folder = "")
    {
        try
        {
            var files = new List<FileMetadata>();
            var prefix = string.IsNullOrWhiteSpace(folder) ? "" : $"{folder}/";

            var request = new ListObjectsV2Request
            {
                BucketName = _bucketName,
                Prefix = prefix
            };

            ListObjectsV2Response response;
            do
            {
                response = await _s3Client.ListObjectsV2Async(request);

                foreach (var obj in response.S3Objects)
                {
                    // Get metadata
                    var metadataRequest = new GetObjectMetadataRequest
                    {
                        BucketName = _bucketName,
                        Key = obj.Key
                    };

                    var metadata = await _s3Client.GetObjectMetadataAsync(metadataRequest);

                    files.Add(new FileMetadata
                    {
                        FileName = Path.GetFileName(obj.Key),
                        FilePath = obj.Key,
                        FileSize = obj.Size ?? 0,
                        ContentType = metadata.Headers.ContentType ?? "application/octet-stream",
                        CreatedAt = obj.LastModified ?? DateTime.UtcNow,
                        ModifiedAt = obj.LastModified ?? DateTime.UtcNow
                    });
                }

                request.ContinuationToken = response.NextContinuationToken;
            } while (response.IsTruncated == true);

            _logger.LogDebug("Listed {Count} files in AWS S3 folder: {Folder}", files.Count, folder);
            return files;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing files in AWS S3 folder: {Folder}", folder);
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

            var request = new GetObjectMetadataRequest
            {
                BucketName = _bucketName,
                Key = filePath
            };

            var metadata = await _s3Client.GetObjectMetadataAsync(request);
            return metadata.ContentLength;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("File not found in AWS S3: {FilePath}", filePath);
            return 0L;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file size from AWS S3: {FilePath}", filePath);
            return 0L;
        }
    }
}