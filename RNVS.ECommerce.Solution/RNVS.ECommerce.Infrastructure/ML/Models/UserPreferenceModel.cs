public class UserPreferenceModel
{
    public string UserId { get; set; }
    public Dictionary<string, int> CategoryViews { get; set; }
    // Example: { "Electronics": 15, "Books": 8, "Clothing": 3 }

    public List<string> ViewedProducts { get; set; }
    // Example: ["prod123", "prod456", "prod789"]

    public decimal AveragePriceRange { get; set; }
    // Example: 2500 (user typically buys items around ₹2500)
}