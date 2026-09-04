namespace RNVS.ECommerce.Infrastructure.ML;

public class MLOptions
{
    public string ModelsPath { get; set; } = "Infrastructure/ML/Models";

    public RecommendationEngineOptions RecommendationEngine { get; set; } = new()
    {
        MaxRecommendations = 10,           // Return top 10 products
        MinConfidenceScore = 0.5,          // Only show if 50%+ confident
        EnableCollaborativeFiltering = true // Use "users who bought X also bought Y"
    };
}