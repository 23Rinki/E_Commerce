namespace RNVS.ECommerce.Infrastructure.ML;

public class RecommendationEngineOptions
{
    public int MaxRecommendations { get; set; } = 10;
    public double MinConfidenceScore { get; set; } = 0.5;
    public bool EnableCollaborativeFiltering { get; set; } = true;
    public bool EnableContentBasedFiltering { get; set; } = true;
}
