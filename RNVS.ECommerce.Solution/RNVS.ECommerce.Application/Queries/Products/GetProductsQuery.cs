namespace RNVS.ECommerce.Application.Queries.Products;

public class GetProductsQuery
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}