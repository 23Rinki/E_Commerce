using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace RNVS.ECommerce.Infrastructure.PDF;

public class PdfGenerator : IPdfGenerator
{
    private readonly ILogger<PdfGenerator> _logger;
    private readonly string _outputPath;

    public PdfGenerator(ILogger<PdfGenerator> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _outputPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "receipts");

        // QuestPDF License Configuration (Free for development/testing)
        QuestPDF.Settings.License = LicenseType.Community;

        if (!Directory.Exists(_outputPath))
        {
            Directory.CreateDirectory(_outputPath);
            _logger.LogInformation("Created PDF output directory: {Path}", _outputPath);
        }
    }

    public Task<byte[]> GeneratePdfAsync(string htmlContent)
    {
        throw new NotImplementedException("Use specific generators (Receipt/Invoice) instead");
    }

    public async Task<string> GeneratePdfAndSaveAsync(byte[] pdfBytes, string fileName)
    {
        try
        {
            if (!fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                fileName += ".pdf";
            }

            var filePath = Path.Combine(_outputPath, fileName);
            await File.WriteAllBytesAsync(filePath, pdfBytes);

            _logger.LogInformation("PDF saved to: {FilePath}", filePath);
            return filePath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving PDF: {FileName}", fileName);
            throw;
        }
    }

    protected static void DrawHeader(IContainer container, string title, string primaryColor)
    {
        container.Background(primaryColor).Padding(20).Column(column =>
        {
            column.Item().Text(title)
                .FontSize(28)
                .Bold()
                .FontColor(Colors.White);
        });
    }

    protected static void DrawFooter(IContainer container, string companyName, string email, string phone, string website)
    {
        container.BorderTop(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(column =>
        {
            column.Item().AlignCenter().Text("This is a computer-generated document and does not require a signature.")
                .FontSize(9)
                .Italic()
                .FontColor(Colors.Grey.Darken1);

            column.Item().PaddingTop(5).AlignCenter().Text(text =>
            {
                text.Span($"For queries: {email} | {phone}").FontSize(9).FontColor(Colors.Grey.Darken1);
            });

            if (!string.IsNullOrWhiteSpace(website))
            {
                column.Item().PaddingTop(2).AlignCenter().Text($"Visit: {website}")
                    .FontSize(9)
                    .FontColor(Colors.Blue.Medium);
            }
        });
    }
}