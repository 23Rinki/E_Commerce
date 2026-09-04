using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.Security;
using RNVS.ECommerce.Domain.Entities.Product;
using RNVS.ECommerce.Domain.Entities.Shopping;

public class RecommendationInput
{
    public float UserId { get; set; }      // Converted to number: user123 → 123
    public float ProductId { get; set; }   // Converted to number: prod456 → 456
    public float Label { get; set; }       // Rating/Weight: 5.0
}
//```

//**Example Training Data:**
//```
//UserId | ProductId | Label(Rating)
//------ -| -----------| ---------------
//123 | 456 | 5.0(purchased)
//123 | 789 | 1.0(viewed)
//456 | 789 | 5.0(purchased)
//456 | 456 | 3.0(added to cart)