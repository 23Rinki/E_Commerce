using Microsoft.Extensions.Logging;
using RNVS.ECommerce.Infrastructure.PDF.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace RNVS.ECommerce.Infrastructure.PDF;

public class PdfInvoiceGenerator : PdfGenerator
{
    private readonly ILogger<PdfInvoiceGenerator> _logger;

    public PdfInvoiceGenerator(ILogger<PdfInvoiceGenerator> logger) : base(logger)
    {
        _logger = logger;
    }

    public async Task<byte[]> GenerateInvoiceAsync(InvoiceData data)
    {
        try
        {
            if (data == null)
            {
                throw new ArgumentNullException(nameof(data));
            }

            _logger.LogInformation("Generating invoice for order: {OrderId}", data.OrderId);

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                    page.Header().Element(c => ComposeHeader(c, data));
                    page.Content().Element(c => ComposeContent(c, data));
                    page.Footer().Element(c => ComposeFooter(c, data));
                });
            });

            var pdfBytes = document.GeneratePdf();
            _logger.LogInformation("Invoice PDF generated successfully, size: {Size} bytes", pdfBytes.Length);

            return await Task.FromResult(pdfBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating invoice for order: {OrderId}", data?.OrderId);
            throw;
        }
    }

    private void ComposeHeader(IContainer container, InvoiceData data)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                // Company Info
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text(data.Company.Name)
                        .FontSize(24)
                        .Bold()
                        .FontColor(data.Company.PrimaryColor);

                    col.Item().PaddingTop(5).Text(text =>
                    {
                        text.Span($"{data.Company.Address}\n").FontSize(9).FontColor(Colors.Grey.Darken1);
                        text.Span($"{data.Company.City}, {data.Company.State} {data.Company.ZipCode}\n").FontSize(9).FontColor(Colors.Grey.Darken1);
                        text.Span($"Phone: {data.Company.Phone}\n").FontSize(9).FontColor(Colors.Grey.Darken1);
                        text.Span($"Email: {data.Company.Email}").FontSize(9).FontColor(Colors.Grey.Darken1);
                    });

                    if (!string.IsNullOrWhiteSpace(data.Company.TaxId))
                    {
                        col.Item().PaddingTop(2).Text($"Tax ID: {data.Company.TaxId}")
                            .FontSize(9).FontColor(Colors.Grey.Darken1);
                    }
                });

                // Invoice Status Badge
                row.ConstantItem(120).AlignRight().Column(col =>
                {
                    var statusColor = data.InvoiceStatus.ToLower() switch
                    {
                        "paid" => Colors.Green.Medium,
                        "unpaid" => Colors.Orange.Medium,
                        "overdue" => Colors.Red.Medium,
                        _ => Colors.Grey.Medium
                    };

                    col.Item().Background(statusColor).Padding(10).AlignCenter()
                        .Text(data.InvoiceStatus.ToUpper())
                        .Bold()
                        .FontColor(Colors.White)
                        .FontSize(12);
                });
            });

            column.Item().PaddingTop(20).AlignCenter().Text("INVOICE")
                .FontSize(32)
                .Bold()
                .FontColor(data.Company.PrimaryColor);

            column.Item().PaddingVertical(10).LineHorizontal(2).LineColor(data.Company.PrimaryColor);
        });
    }

    private void ComposeContent(IContainer container, InvoiceData data)
    {
        container.PaddingVertical(10).Column(column =>
        {
            // Invoice Details and Addresses
            column.Item().Row(row =>
            {
                // Invoice Info
                row.RelativeItem().Column(col =>
                {
                    col.Item().Element(c => InfoBlock(c, "INVOICE NUMBER", data.InvoiceNumber));
                    col.Item().Element(c => InfoBlock(c, "ORDER ID", data.OrderId));
                    col.Item().Element(c => InfoBlock(c, "ISSUE DATE", data.IssueDate.ToString("MMMM dd, yyyy")));
                    col.Item().Element(c => InfoBlock(c, "DUE DATE", data.DueDate.ToString("MMMM dd, yyyy")));

                    if (!string.IsNullOrWhiteSpace(data.PurchaseOrderNumber))
                    {
                        col.Item().Element(c => InfoBlock(c, "PO NUMBER", data.PurchaseOrderNumber));
                    }

                    col.Item().Element(c => InfoBlock(c, "PAYMENT TERMS", data.Terms));
                });

                row.ConstantItem(20);

                // Bill To & Ship To
                row.RelativeItem().Column(col =>
                {
                    // Bill To
                    col.Item().Background(Colors.Grey.Lighten3).Padding(10).Column(billCol =>
                    {
                        billCol.Item().Text("BILL TO").Bold().FontSize(11);
                        billCol.Item().PaddingTop(5).Text(data.BillingAddress.Name).Bold();
                        if (!string.IsNullOrWhiteSpace(data.BillingAddress.Phone))
                            billCol.Item().Text(data.BillingAddress.Phone).FontSize(9);
                        billCol.Item().Text($"{data.BillingAddress.Address}").FontSize(9);
                        billCol.Item().Text($"{data.BillingAddress.City}, {data.BillingAddress.State} {data.BillingAddress.ZipCode}").FontSize(9);
                        billCol.Item().Text(data.BillingAddress.Country).FontSize(9);
                    });

                    col.Item().PaddingTop(10).Background(Colors.Grey.Lighten4).Padding(10).Column(shipCol =>
                    {
                        shipCol.Item().Text("SHIP TO").Bold().FontSize(11);
                        shipCol.Item().PaddingTop(5).Text(data.ShippingAddress.Name).Bold();
                        shipCol.Item().Text($"{data.ShippingAddress.Address}").FontSize(9);
                        shipCol.Item().Text($"{data.ShippingAddress.City}, {data.ShippingAddress.State} {data.ShippingAddress.ZipCode}").FontSize(9);
                        shipCol.Item().Text(data.ShippingAddress.Country).FontSize(9);
                    });
                });
            });

            // Items Table
            column.Item().PaddingTop(20).Element(c => ComposeItemsTable(c, data));

            // Totals
            column.Item().PaddingTop(20).AlignRight().Width(300).Element(c => ComposeTotals(c, data));

            // Payment Information
            column.Item().PaddingTop(20).Row(row =>
            {
                row.RelativeItem().Element(c => InfoBlock(c, "PAYMENT METHOD", data.PaymentMethod));
                row.ConstantItem(20);
                row.RelativeItem().Element(c => InfoBlock(c, "PAYMENT STATUS", data.PaymentStatus));
            });

            // Notes
            if (!string.IsNullOrWhiteSpace(data.Notes))
            {
                column.Item().PaddingTop(20).Background(Colors.Grey.Lighten3).Padding(10).Column(col =>
                {
                    col.Item().Text("Notes:").Bold().FontSize(10);
                    col.Item().PaddingTop(5).Text(data.Notes).FontSize(9);
                });
            }

            // Thank-you note
            column.Item().PaddingTop(20).BorderTop(1).BorderColor(Colors.Grey.Lighten2).PaddingTop(10)
                .Text("Thank you for your business!")
                .FontSize(9).Italic().FontColor(Colors.Grey.Darken1);
        });
    }

    private void ComposeItemsTable(IContainer container, InvoiceData data)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.RelativeColumn(3);
                columns.RelativeColumn(2);
                columns.RelativeColumn(1);
                columns.RelativeColumn(1.5f);
                columns.RelativeColumn(1.5f);
            });

            table.Header(header =>
            {
                header.Cell().Background(data.Company.PrimaryColor).Padding(8)
                    .Text("Item").Bold().FontColor(Colors.White);
                header.Cell().Background(data.Company.PrimaryColor).Padding(8)
                    .Text("SKU").Bold().FontColor(Colors.White);
                header.Cell().Background(data.Company.PrimaryColor).Padding(8).AlignRight()
                    .Text("Qty").Bold().FontColor(Colors.White);
                header.Cell().Background(data.Company.PrimaryColor).Padding(8).AlignRight()
                    .Text("Unit Price").Bold().FontColor(Colors.White);
                header.Cell().Background(data.Company.PrimaryColor).Padding(8).AlignRight()
                    .Text("Total").Bold().FontColor(Colors.White);
            });

            foreach (var item in data.Items)
            {
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8)
                    .Column(col =>
                    {
                        col.Item().Text(item.Name).Bold();
                        if (!string.IsNullOrWhiteSpace(item.Description))
                        {
                            col.Item().Text(item.Description).FontSize(8).FontColor(Colors.Grey.Darken1);
                        }
                    });

                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8)
                    .Text(item.SKU);

                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).AlignRight()
                    .Text(item.Quantity.ToString());

                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).AlignRight()
                    .Text($"₹{item.UnitPrice:N2}");

                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).AlignRight()
                    .Text($"₹{item.Total:N2}").Bold();
            }
        });
    }

    private void ComposeTotals(IContainer container, InvoiceData data)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                row.RelativeItem().Text("Subtotal:").Bold();
                row.ConstantItem(100).AlignRight().Text($"₹{data.Subtotal:N2}");
            });

            if (data.Discount > 0)
            {
                column.Item().PaddingTop(5).Row(row =>
                {
                    row.RelativeItem().Text("Discount:").Bold();
                    row.ConstantItem(100).AlignRight().Text($"-₹{data.Discount:N2}").FontColor(Colors.Red.Medium);
                });
            }

            column.Item().PaddingTop(5).Row(row =>
            {
                row.RelativeItem().Text("CGST @ 9%:").Bold();
                row.ConstantItem(100).AlignRight().Text($"₹{data.Tax / 2m:N2}");
            });

            column.Item().PaddingTop(5).Row(row =>
            {
                row.RelativeItem().Text("SGST @ 9%:").Bold();
                row.ConstantItem(100).AlignRight().Text($"₹{data.Tax / 2m:N2}");
            });

            column.Item().PaddingTop(5).Row(row =>
            {
                row.RelativeItem().Text("Shipping:").Bold();
                row.ConstantItem(100).AlignRight().Text($"₹{data.Shipping:N2}");
            });

            column.Item().PaddingTop(10).BorderTop(2).BorderColor(data.Company.PrimaryColor)
                .PaddingTop(5).Row(row =>
                {
                    row.RelativeItem().Text("Amount Due:").Bold().FontSize(14);
                    row.ConstantItem(100).AlignRight().Text($"₹{data.Total:N2}").Bold().FontSize(14)
                        .FontColor(data.Company.PrimaryColor);
                });
        });
    }

    private void ComposeFooter(IContainer container, InvoiceData data)
    {
        DrawFooter(container, data.Company.Name, data.Company.Email, data.Company.Phone, data.Company.Website);
    }

    private void InfoBlock(IContainer container, string label, string value)
    {
        container.Column(column =>
        {
            column.Item().Text(label).FontSize(9).Bold().FontColor(Colors.Grey.Darken1);
            column.Item().PaddingTop(2).Text(value).FontSize(10);
            column.Item().PaddingBottom(8);
        });
    }
}