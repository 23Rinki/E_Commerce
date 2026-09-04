namespace RNVS.ECommerce.Infrastructure.Storage;

public class StorageOptions
{
    public string Provider { get; set; } = "Local"; // Local, Azure, AWS
    public int MaxFileSizeInMB { get; set; } = 10;
    public List<string> AllowedImageExtensions { get; set; } = new() { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" };
    public List<string> AllowedDocumentExtensions { get; set; } = new() { ".pdf", ".doc", ".docx", ".xls", ".xlsx" };

    public LocalStorageOptions Local { get; set; } = new();
    public AzureStorageOptions Azure { get; set; } = new();
    public AwsStorageOptions AWS { get; set; } = new();
}

public class LocalStorageOptions
{
    public string RootPath { get; set; } = "wwwroot/uploads";
    public string BaseUrl { get; set; } = "/uploads";
}

public class AzureStorageOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    public string ContainerName { get; set; } = "rnvs-ecommerce";
    public string BaseUrl { get; set; } = string.Empty;
}

public class AwsStorageOptions
{
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string BucketName { get; set; } = "rnvs-ecommerce";
    public string Region { get; set; } = "ap-south-1";
    public string BaseUrl { get; set; } = string.Empty;
}