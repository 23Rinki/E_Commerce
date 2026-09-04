using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace RNVS.ECommerce.Infrastructure.Email;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _smtpUsername;
    private readonly string _smtpPassword;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _smtpHost = configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
        _smtpPort = int.Parse(configuration["Email:SmtpPort"] ?? "587");
        _smtpUsername = configuration["Email:Username"] ?? "";
        _smtpPassword = configuration["Email:Password"] ?? "";
        _fromEmail = configuration["Email:FromEmail"] ?? "";
        _fromName = configuration["Email:FromName"] ?? "RNVS CommerceX";
    }

    public async Task<bool> SendEmailAsync(string to, string subject, string body)
    {
        return await SendEmailAsync(to, subject, body, new List<EmailAttachment>());
    }

    public async Task<bool> SendEmailAsync(string to, string subject, string body, List<EmailAttachment> attachments)
    {
        try
        {
            _logger.LogInformation("Sending email to {To} with subject {Subject}", to, subject);

            using var smtpClient = new SmtpClient(_smtpHost, _smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(_smtpUsername, _smtpPassword)
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_fromEmail, _fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mailMessage.To.Add(to);

            // Add attachments
            foreach (var attachment in attachments)
            {
                var stream = new MemoryStream(attachment.Content);
                mailMessage.Attachments.Add(new Attachment(stream, attachment.FileName, attachment.ContentType));
            }

            await smtpClient.SendMailAsync(mailMessage);

            _logger.LogInformation("Email sent successfully to {To}", to);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            return false;
        }
    }

    public async Task<bool> SendTemplateEmailAsync(string to, string subject, string templateName, Dictionary<string, string> templateData)
    {
        try
        {
            var templatePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Email", "Templates", $"{templateName}.html");

            if (!File.Exists(templatePath))
            {
                _logger.LogError("Email template {TemplateName} not found", templateName);
                return false;
            }

            var body = await File.ReadAllTextAsync(templatePath);

            // Replace placeholders
            foreach (var data in templateData)
            {
                body = body.Replace($"{{{{{data.Key}}}}}", data.Value);
            }

            return await SendEmailAsync(to, subject, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send template email");
            return false;
        }
    }
}