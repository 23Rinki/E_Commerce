using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RNVS.ECommerce.Infrastructure.Payment;

public class StripePaymentService : IPaymentProcessor
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<StripePaymentService> _logger;

    public StripePaymentService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<StripePaymentService> logger)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Stripe:SecretKey"] ?? throw new ArgumentNullException("Stripe API Key not configured");
        _logger = logger;
        _httpClient.BaseAddress = new Uri("https://api.stripe.com/v1/");
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
    }

    public string ProviderName => "Stripe";

    public async Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request)
    {
        try
        {
            _logger.LogInformation("Processing Stripe payment for order {OrderId}", request.OrderId);

            // Create Stripe Payment Intent
            var formData = new Dictionary<string, string>
            {
                { "amount", ((int)(request.Amount * 100)).ToString() }, // Convert to paisa/cents
                { "currency", request.Currency.ToLower() },
                { "description", $"Order {request.OrderId}" },
                { "receipt_email", request.CustomerEmail },
                { "metadata[order_id]", request.OrderId }
            };

            var content = new FormUrlEncodedContent(formData);
            var response = await _httpClient.PostAsync("payment_intents", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Stripe payment failed: {Response}", responseContent);
                return new PaymentResult
                {
                    Success = false,
                    Message = "Payment processing failed",
                    Status = PaymentStatus.Failed
                };
            }

            var paymentIntent = System.Text.Json.JsonSerializer.Deserialize<StripePaymentIntent>(responseContent);

            _logger.LogInformation("Stripe payment intent created: {PaymentIntentId}", paymentIntent?.Id);

            return new PaymentResult
            {
                Success = true,
                TransactionId = paymentIntent?.Id,
                Message = "Payment initiated successfully",
                Status = PaymentStatus.Processing,
                PaymentUrl = paymentIntent?.ClientSecret
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Stripe payment");
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
            _logger.LogInformation("Processing Stripe refund for transaction {TransactionId}", transactionId);

            var formData = new Dictionary<string, string>
            {
                { "payment_intent", transactionId },
                { "amount", ((int)(amount * 100)).ToString() }
            };

            var content = new FormUrlEncodedContent(formData);
            var response = await _httpClient.PostAsync("refunds", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Stripe refund failed");
                return new PaymentResult
                {
                    Success = false,
                    Message = "Refund processing failed",
                    Status = PaymentStatus.Failed
                };
            }

            _logger.LogInformation("Stripe refund processed successfully");

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
            _logger.LogError(ex, "Error processing Stripe refund");
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
            _logger.LogInformation("Verifying Stripe payment {TransactionId}", transactionId);

            var response = await _httpClient.GetAsync($"payment_intents/{transactionId}");
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return PaymentStatus.Failed;
            }

            var paymentIntent = System.Text.Json.JsonSerializer.Deserialize<StripePaymentIntent>(responseContent);

            return paymentIntent?.Status switch
            {
                "succeeded" => PaymentStatus.Success,
                "processing" => PaymentStatus.Processing,
                "canceled" => PaymentStatus.Cancelled,
                _ => PaymentStatus.Failed
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Stripe payment");
            return PaymentStatus.Failed;
        }
    }
}

// Stripe Response Models
public class StripePaymentIntent
{
    public string? Id { get; set; }
    public string? ClientSecret { get; set; }
    public string? Status { get; set; }
}