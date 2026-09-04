namespace RNVS.ECommerce.Infrastructure.Email;

public interface IEmailService
{
    Task<bool> SendEmailAsync(string to, string subject, string body);
    Task<bool> SendEmailAsync(string to, string subject, string body, List<EmailAttachment> attachments);
    Task<bool> SendTemplateEmailAsync(string to, string subject, string templateName, Dictionary<string, string> templateData);
}

public class EmailAttachment
{
    public string FileName { get; set; } = string.Empty;
    public byte[] Content { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = "application/octet-stream";
}