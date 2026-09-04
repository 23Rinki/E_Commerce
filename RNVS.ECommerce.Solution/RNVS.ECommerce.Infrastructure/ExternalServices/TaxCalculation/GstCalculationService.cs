using Microsoft.Extensions.Logging;

namespace RNVS.ECommerce.Infrastructure.ExternalServices.TaxCalculation;

public class GstCalculationService : ITaxCalculationService
{
    private readonly ILogger<GstCalculationService> _logger;

    public GstCalculationService(ILogger<GstCalculationService> logger)
    {
        _logger = logger;
    }

    public string ServiceName => "GST India";

    public Task<TaxCalculationResult> CalculateTaxAsync(TaxCalculationRequest request)
    {
        try
        {
            _logger.LogInformation("Calculating GST for amount {Amount}", request.Amount);

            var gstRate = GetGstRate(request.ProductCategory);
            var taxAmount = request.Amount * gstRate / 100;
            var totalAmount = request.Amount + taxAmount;

            var result = new TaxCalculationResult
            {
                TaxAmount = taxAmount,
                TotalAmount = totalAmount
            };

            // Determine if inter-state or intra-state
            if (request.OriginState == request.DestinationState)
            {
                // Intra-state: CGST + SGST
                result.Breakdown.Add(new TaxBreakdown
                {
                    TaxType = "CGST",
                    Rate = gstRate / 2,
                    Amount = taxAmount / 2
                });
                result.Breakdown.Add(new TaxBreakdown
                {
                    TaxType = "SGST",
                    Rate = gstRate / 2,
                    Amount = taxAmount / 2
                });
            }
            else
            {
                // Inter-state: IGST
                result.Breakdown.Add(new TaxBreakdown
                {
                    TaxType = "IGST",
                    Rate = gstRate,
                    Amount = taxAmount
                });
            }

            _logger.LogInformation("GST calculated: {TaxAmount}", taxAmount);
            return Task.FromResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating GST");
            throw;
        }
    }

    public Task<bool> ValidateGstNumberAsync(string gstNumber)
    {
        // GST format: 22AAAAA0000A1Z5
        if (string.IsNullOrEmpty(gstNumber) || gstNumber.Length != 15)
            return Task.FromResult(false);

        // Basic validation
        return Task.FromResult(System.Text.RegularExpressions.Regex.IsMatch(
            gstNumber,
            @"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"));
    }

    private decimal GetGstRate(string category)
    {
        // GST rates based on product category
        return category.ToLower() switch
        {
            "electronics" => 18,
            "clothing" => 12,
            "books" => 5,
            "food" => 5,
            "medicines" => 5,
            "luxury" => 28,
            _ => 18 // Default rate
        };
    }
}