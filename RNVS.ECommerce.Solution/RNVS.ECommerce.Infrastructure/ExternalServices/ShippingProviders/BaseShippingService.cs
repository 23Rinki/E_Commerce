using Microsoft.Extensions.Logging;
using Polly;
using Polly.Extensions.Http;
using System.Text.Json;

namespace RNVS.ECommerce.Infrastructure.ExternalServices.ShippingProviders;

public abstract class BaseShippingService
{
    protected readonly HttpClient _httpClient;
    protected readonly ILogger _logger;

    protected BaseShippingService(HttpClient httpClient, ILogger logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    protected async Task<T?> SendRequestAsync<T>(
        HttpMethod method,
        string endpoint,
        object? data = null,
        Dictionary<string, string>? headers = null)
    {
        try
        {
            var request = new HttpRequestMessage(method, endpoint);

            // Add headers
            if (headers != null)
            {
                foreach (var header in headers)
                {
                    request.Headers.Add(header.Key, header.Value);
                }
            }

            // Add body for POST/PUT
            if (data != null && (method == HttpMethod.Post || method == HttpMethod.Put))
            {
                var json = JsonSerializer.Serialize(data);
                request.Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                _logger.LogInformation("Request Body: {Json}", json);
            }

            _logger.LogInformation("Sending {Method} request to {Endpoint}", method, endpoint);

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("Response Status: {StatusCode}, Body: {Body}",
                response.StatusCode, responseContent);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("API Error: {StatusCode} - {Content}",
                    response.StatusCode, responseContent);
                return default;
            }

            return JsonSerializer.Deserialize<T>(responseContent,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP Request failed for {Endpoint}", endpoint);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling {Endpoint}", endpoint);
            throw;
        }
    }

    public static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
    }
}