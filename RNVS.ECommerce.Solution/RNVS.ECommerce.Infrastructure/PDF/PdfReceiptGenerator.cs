using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Infrastructure.PDF.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace RNVS.ECommerce.Infrastructure.PDF;

public class PdfReceiptGenerator : PdfGenerator
{
    private readonly ILogger<PdfReceiptGenerator> _logger;

    public PdfReceiptGenerator(ILogger<PdfReceiptGenerator> logger) : base(logger)
    {
        _logger = logger;
    }

    public async Task<byte[]> GenerateReceiptAsync(ReceiptData data, string templateType = "Standard")
    {
        try
        {
            if (data == null)
            {
                throw new ArgumentNullException(nameof(data));
            }

            _logger.LogInformation("Generating {TemplateType} receipt for order: {OrderId}", templateType, data.OrderId);

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A5);
                    page.Margin(24);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

                    page.Content().Element(c => ComposeReceipt(c, data));
                });
            });

            var pdfBytes = document.GeneratePdf();
            _logger.LogInformation("Receipt PDF generated successfully, size: {Size} bytes", pdfBytes.Length);

            return await Task.FromResult(pdfBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating receipt for order: {OrderId}", data?.OrderId);
            throw;
        }
    }

    private void ComposeReceipt(IContainer container, ReceiptData data)
    {
        container.Column(column =>
        {
            // ── Header: logo + store details (left) | RECEIPT badge (right) ──────
            column.Item().Row(row =>
            {
                row.RelativeItem(2).Column(col =>
                {
                    var hasLogo = !string.IsNullOrWhiteSpace(data.Company.LogoUrl) && File.Exists(data.Company.LogoUrl);
                    if (hasLogo)
                    {
                        col.Item().Height(40).Image(data.Company.LogoUrl!).FitHeight();
                    }

                    col.Item().PaddingTop(hasLogo ? 4 : 0).Text(data.Company.Name)
                        .FontSize(18).Bold().FontColor(data.Company.PrimaryColor);

                    if (!string.IsNullOrWhiteSpace(data.Company.Address))
                        col.Item().Text($"{data.Company.Address}, {data.Company.City} {data.Company.State}".Trim(' ', ',')).FontSize(8).FontColor(Colors.Grey.Darken2);

                    col.Item().Text(text =>
                    {
                        if (!string.IsNullOrWhiteSpace(data.Company.Phone)) text.Span($"{data.Company.Phone}  ").FontSize(8).FontColor(Colors.Grey.Darken2);
                        if (!string.IsNullOrWhiteSpace(data.Company.Email)) text.Span(data.Company.Email).FontSize(8).FontColor(Colors.Grey.Darken2);
                    });
                });

                row.ConstantItem(120).Background(data.Company.PrimaryColor).Padding(8).Column(col =>
                {
                    col.Item().AlignCenter().Text("RECEIPT").Bold().FontSize(11).FontColor(Colors.White);
                    col.Item().PaddingTop(4).Text($"Receipt No.\n{data.ReceiptNumber}").FontSize(7).FontColor(Colors.White).LineHeight(1.3f);
                    col.Item().PaddingTop(4).Text($"Date\n{data.Date:dd MMM yyyy}").FontSize(7).FontColor(Colors.White).LineHeight(1.3f);
                });
            });

            column.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            // ── Billed To ──────────────────────────────────────────────────────
            column.Item().Column(col =>
            {
                col.Item().Text(t => { t.Span("Billed To : ").FontSize(9).SemiBold(); t.Span(data.Customer.Name).FontSize(9); });
                col.Item().Text(t => { t.Span("Mobile No. : ").FontSize(9).SemiBold(); t.Span(data.Customer.Phone).FontSize(9); });
                var address = string.Join(", ", new[] { data.Customer.Address, data.Customer.City, data.Customer.State, data.Customer.ZipCode }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
                col.Item().Text(t => { t.Span("Address : ").FontSize(9).SemiBold(); t.Span(string.IsNullOrWhiteSpace(address) ? "—" : address).FontSize(9); });
            });

            column.Item().PaddingTop(12).Element(c => ComposeItemsTable(c, data));

            column.Item().PaddingTop(14).AlignRight().Width(220).Element(c => ComposeTotals(c, data));

            column.Item().PaddingTop(14).Background(Colors.Grey.Lighten4).Padding(8).Text(t =>
            {
                t.Span("Amount in Words: ").SemiBold().FontSize(8);
                t.Span(NumberToWords(data.Total)).Italic().FontSize(8);
            });

            column.Item().PaddingTop(16).AlignCenter().Text(data.ThankYouMessage)
                .FontSize(10).Italic().Bold().FontColor(data.Company.PrimaryColor);

            if (!string.IsNullOrWhiteSpace(data.Notes))
            {
                column.Item().PaddingTop(10).Background(Colors.Grey.Lighten4).Padding(8).Column(col =>
                {
                    col.Item().Text("Notes").Bold().FontSize(8);
                    col.Item().PaddingTop(3).Text(data.Notes).FontSize(8);
                });
            }
        });
    }

    private void ComposeItemsTable(IContainer container, ReceiptData data)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(24);   // S.No
                columns.RelativeColumn(4);    // Description
                columns.RelativeColumn(1);    // Qty
                columns.RelativeColumn(1.4f); // Rate
                columns.RelativeColumn(1.4f); // Amount
            });

            table.Header(header =>
            {
                header.Cell().Background(data.Company.PrimaryColor).Padding(6).Text("S.No").Bold().FontSize(8).FontColor(Colors.White);
                header.Cell().Background(data.Company.PrimaryColor).Padding(6).Text("Item Description").Bold().FontSize(8).FontColor(Colors.White);
                header.Cell().Background(data.Company.PrimaryColor).Padding(6).AlignRight().Text("Qty").Bold().FontSize(8).FontColor(Colors.White);
                header.Cell().Background(data.Company.PrimaryColor).Padding(6).AlignRight().Text("Rate").Bold().FontSize(8).FontColor(Colors.White);
                header.Cell().Background(data.Company.PrimaryColor).Padding(6).AlignRight().Text("Amount").Bold().FontSize(8).FontColor(Colors.White);
            });

            var i = 1;
            foreach (var item in data.Items)
            {
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Text((i++).ToString()).FontSize(8);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Text(item.Name).FontSize(8);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight().Text(item.Quantity.ToString()).FontSize(8);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight().Text($"{item.UnitPrice:N2}").FontSize(8);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight().Text($"{item.Total:N2}").Bold().FontSize(8);
            }
        });
    }

    private void ComposeTotals(IContainer container, ReceiptData data)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                row.RelativeItem().Text("Sub Total").FontSize(9);
                row.ConstantItem(90).AlignRight().Text($"₹{data.Subtotal:N2}").FontSize(9);
            });

            if (data.Discount > 0)
            {
                column.Item().PaddingTop(3).Row(row =>
                {
                    row.RelativeItem().Text("Discount").FontSize(9);
                    row.ConstantItem(90).AlignRight().Text($"-₹{data.Discount:N2}").FontColor(Colors.Red.Medium).FontSize(9);
                });
            }

            if (data.Tax > 0)
            {
                column.Item().PaddingTop(3).Row(row =>
                {
                    row.RelativeItem().Text("Tax").FontSize(9);
                    row.ConstantItem(90).AlignRight().Text($"₹{data.Tax:N2}").FontSize(9);
                });
            }

            if (data.Shipping > 0)
            {
                column.Item().PaddingTop(3).Row(row =>
                {
                    row.RelativeItem().Text("Shipping").FontSize(9);
                    row.ConstantItem(90).AlignRight().Text($"₹{data.Shipping:N2}").FontSize(9);
                });
            }

            column.Item().PaddingTop(8).Background(data.Company.PrimaryColor).Padding(8).Row(row =>
            {
                row.RelativeItem().Text("Grand Total").Bold().FontSize(11).FontColor(Colors.White);
                row.ConstantItem(90).AlignRight().Text($"₹{data.Total:N2}").Bold().FontSize(11).FontColor(Colors.White);
            });
        });
    }

    // Converts a rupee amount into words, Indian numbering system (Crore/Lakh/Thousand).
    private static string NumberToWords(decimal amount)
    {
        var rupees = (long)Math.Floor(amount);
        if (rupees == 0) return "Rupees Zero Only";

        var words = ConvertIndianGroups(rupees);
        return $"Rupees {words} Only";
    }

    private static readonly string[] Ones =
        { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
          "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
    private static readonly string[] Tens =
        { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

    private static string ConvertIndianGroups(long n)
    {
        if (n == 0) return "";
        if (n < 20) return Ones[n];
        if (n < 100) return (Tens[n / 10] + " " + ConvertIndianGroups(n % 10)).Trim();
        if (n < 1000) return (Ones[n / 100] + " Hundred " + ConvertIndianGroups(n % 100)).Trim();
        if (n < 100000) return (ConvertIndianGroups(n / 1000) + " Thousand " + ConvertIndianGroups(n % 1000)).Trim();
        if (n < 10000000) return (ConvertIndianGroups(n / 100000) + " Lakh " + ConvertIndianGroups(n % 100000)).Trim();
        return (ConvertIndianGroups(n / 10000000) + " Crore " + ConvertIndianGroups(n % 10000000)).Trim();
    }
}
