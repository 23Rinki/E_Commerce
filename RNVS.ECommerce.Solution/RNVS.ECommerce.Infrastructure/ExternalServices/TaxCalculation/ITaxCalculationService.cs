namespace RNVS.ECommerce.Infrastructure.ExternalServices.TaxCalculation;

public interface ITaxCalculationService
{
    Task<TaxCalculationResult> CalculateTaxAsync(TaxCalculationRequest request);
    Task<bool> ValidateGstNumberAsync(string gstNumber);
    string ServiceName { get; }
}

public class TaxCalculationRequest
{
    public decimal Amount { get; set; }
    public string ProductCategory { get; set; } = string.Empty;
    public string OriginState { get; set; } = string.Empty;
    public string DestinationState { get; set; } = string.Empty;
    public string CountryCode { get; set; } = "IN";
}

public class TaxCalculationResult
{
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public List<TaxBreakdown> Breakdown { get; set; } = new();
}

public class TaxBreakdown
{
    public string TaxType { get; set; } = string.Empty; // CGST, SGST, IGST
    public decimal Rate { get; set; }
    public decimal Amount { get; set; }
}