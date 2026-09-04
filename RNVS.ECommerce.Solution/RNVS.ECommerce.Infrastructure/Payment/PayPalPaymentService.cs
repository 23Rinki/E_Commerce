using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RNVS.ECommerce.Infrastructure.Payment;

public class PayPalPaymentService : IPaymentProcessor
{
    private readonly HttpClient _httpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly ILogger<PayPalPaymentService> _logger;

    public PayPalPaymentService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<PayPalPaymentService> logger)
    {
        _httpClient = httpClient;
        _clientId = configuration["PayPal:ClientId"] ?? throw new ArgumentNullException("PayPal Client ID not configured");
        _clientSecret = configuration["PayPal:ClientSecret"] ?? throw new ArgumentNullException("PayPal Client Secret not configured");
        _logger = logger;
        _httpClient.BaseAddress = new Uri("https://api-m.paypal.com/");
    }

    public string ProviderName => "PayPal";

    public async Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request)
    {
        try
        {
            _logger.LogInformation("Processing PayPal payment for order {OrderId}", request.OrderId);

            // Get Access Token
            var accessToken = await GetAccessTokenAsync();

            if (string.IsNullOrEmpty(accessToken))
            {
                return new PaymentResult
                {
                    Success = false,
                    Message = "Failed to authenticate with PayPal",
                    Status = PaymentStatus.Failed
                };
            }

            // Create PayPal Order
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var orderData = new
            {
                intent = "CAPTURE",
                purchase_units = new[]
                {
                    new
                    {
                        reference_id = request.OrderId,
                        amount = new
                        {
                            currency_code = request.Currency,
                            value = request.Amount.ToString("F2")
                        }
                    }
                }
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(orderData),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync("v2/checkout/orders", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("PayPal payment failed: {Response}", responseContent);
                return new PaymentResult
                {
                    Success = false,
                    Message = "Payment processing failed",
                    Status = PaymentStatus.Failed
                };
            }

            var paypalOrder = System.Text.Json.JsonSerializer.Deserialize<PayPalOrderResponse>(responseContent);
            var approveLink = paypalOrder?.Links?.FirstOrDefault(l => l.Rel == "approve")?.Href;

            _logger.LogInformation("PayPal order created: {OrderId}", paypalOrder?.Id);

            return new PaymentResult
            {
                Success = true,
                TransactionId = paypalOrder?.Id,
                Message = "Payment initiated successfully",
                Status = PaymentStatus.Processing,
                PaymentUrl = approveLink
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing PayPal payment");
            return new PaymentResult
            {
                Success = false,
                Message = ex.Message,
                Status = PaymentStatus.Failed
            };
        }
    }

    public async Task<PaymentResult> RefundPaymentAsync(string transactionId, decimal amount)
    {
        try
        {
            _logger.LogInformation("Processing PayPal refund for transaction {TransactionId}", transactionId);

            var accessToken = await GetAccessTokenAsync();
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var refundData = new
            {
                amount = new
                {
                    currency_code = "INR",
                    value = amount.ToString("F2")
                }
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(refundData),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync($"v2/payments/captures/{transactionId}/refund", content);

            if (!response.IsSuccessStatusCode)
            {
                return new PaymentResult
                {
                    Success = false,
                    Message = "Refund processing failed",
                    Status = PaymentStatus.Failed
                };
            }

            return new PaymentResult
            {
                Success = true,
                TransactionId = transactionId,
                Message = "Refund processed successfully",
                Status = PaymentStatus.Refunded
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing PayPal refund");
            return new PaymentResult
            {
                Success = false,
                Message = ex.Message,
                Status = PaymentStatus.Failed
            };
        }
    }

    public async Task<PaymentStatus> VerifyPaymentAsync(string transactionId)
    {
        try
        {
            var accessToken = await GetAccessTokenAsync();
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.GetAsync($"v2/checkout/orders/{transactionId}");

            if (!response.IsSuccessStatusCode)
            {
                return PaymentStatus.Failed;
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var order = System.Text.Json.JsonSerializer.Deserialize<PayPalOrderResponse>(responseContent);

            return order?.Status switch
            {
                "COMPLETED" => PaymentStatus.Success,
                "APPROVED" => PaymentStatus.Processing,
                "VOIDED" => PaymentStatus.Cancelled,
                _ => PaymentStatus.Failed
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying PayPal payment");
            return PaymentStatus.Failed;
        }
    }

    private async Task<string?> GetAccessTokenAsync()
    {
        var authToken = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($"{_clientId}:{_clientSecret}"));
        _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authToken);

        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "client_credentials")
        });

        var response = await _httpClient.PostAsync("v1/oauth2/token", content);
        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var tokenResponse = System.Text.Json.JsonSerializer.Deserialize<PayPalTokenResponse>(responseContent);
        return tokenResponse?.AccessToken;
    }
}

// PayPal Response Models
public class PayPalOrderResponse
{
    public string? Id { get; set; }
    public string? Status { get; set; }
    public List<PayPalLink>? Links { get; set; }
}

public class PayPalLink
{
    public string? Href { get; set; }
    public string? Rel { get; set; }
}

public class PayPalTokenResponse
{
    public string? AccessToken { get; set; }
}