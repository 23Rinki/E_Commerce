namespace RNVS.ECommerce.Application.DTOs.Shopping;

public class CartDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public List<CartItemDto> Items { get; set; } = new();
    public decimal SubTotal { get; set; }
    public int TotalItems { get; set; }
}