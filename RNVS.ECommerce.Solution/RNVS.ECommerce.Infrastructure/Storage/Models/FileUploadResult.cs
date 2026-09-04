namespace RNVS.ECommerce.Infrastructure.Storage.Models;

public class FileUploadResult
{
    public bool Success { get; set; }
    public string? FilePath { get; set; }
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public long FileSize { get; set; }
    public string? ContentType { get; set; }
    public string? Message { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}