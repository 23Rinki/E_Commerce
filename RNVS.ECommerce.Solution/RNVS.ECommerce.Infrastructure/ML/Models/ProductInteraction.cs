using Elastic.Clients.Elasticsearch.Security;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Domain.ValueObjects;
using RNVS.ECommerce.Domain.Enums;

public class ProductInteraction
{
    public string UserId { get; set; } = "user123";
    public string ProductId { get; set; } = "prod456";
    public InteractionType Type { get; set; } = InteractionType.Purchase;
    public float Weight { get; set; } = 5.0f; // Purchase = highest weight
    public DateTime Timestamp { get; set; } = DateTime.Now;
}
//```

//**Example Data: **
//```
//UserId | ProductId | Type | Weight | Timestamp
//---------- | -----------| -------------| --------| ------------------
//user123 | prod456 | View | 1 | 2025 - 01 - 15 10:30
//user123 | prod456 | AddToCart | 3 | 2025 - 01 - 15 10:35
//user123 | prod456 | Purchase | 5 | 2025 - 01 - 15 10:40
//user123 | prod789 | View | 1 | 2025 - 01 - 15 10:45