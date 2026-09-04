using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RNVS.ECommerce.Infrastructure.ExternalServices.TaxCalculation;

public class TaxJarService : ITaxCalculationService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<TaxJarService> _logger;

    public TaxJarService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<TaxJarService> logger)
    {
        _httpClient = httpClient;
        _apiKey = configuration["TaxJar:ApiKey"] ?? "";
        _logger = logger;
        _httpClient.BaseAddress = new Uri("https://api.taxjar.com/v2/");
    }

    public string ServiceName => "TaxJar (International)";

    public async Task<TaxCalculationResult> CalculateTaxAsync(TaxCalculationRequest request)
    {
        try
        {
            _logger.LogInformation("Calculating tax using TaxJar for {Country}", request.CountryCode);

            // For international sales
            var taxRate = 0.10m; // 10% default international tax
            var taxAmount = request.Amount * taxRate;

            return new TaxCalculationResult
            {
                TaxAmount = taxAmount,
                TotalAmount = request.Amount + taxAmount,
                Breakdown = new List<TaxBreakdown>
                {
                    new TaxBreakdown
                    {
                        TaxType = "Sales Tax",
                        Rate = taxRate * 100,
                        Amount = taxAmount
                    }
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating tax with TaxJar");
            throw;
        }
    }

    public Task<bool> ValidateGstNumberAsync(string gstNumber)
    {
        // TaxJar doesn't validate GST numbers
        return Task.FromResult(false);
    }
}