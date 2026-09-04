namespace RNVS.ECommerce.Application.Commands.Orders;

public class UpdateOrderStatusCommand
{
    public int OrderId { get; set; }
    public int NewStatus { get; set; }
}