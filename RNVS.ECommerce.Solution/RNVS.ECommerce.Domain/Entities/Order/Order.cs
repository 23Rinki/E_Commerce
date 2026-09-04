using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.Order;

public class Order
{
    public int Id { get; set; }

    [Required]
    [StringLength(50)]
    public string OrderNumber { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string? VendorId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal SubTotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ShippingCost { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    [StringLength(15)]
    public string? CustomerGSTIN { get; set; }

    // Shipping address snapshot — captured from the customer's saved address at the moment this
    // order was placed. Deliberately NOT a foreign key to Addresses: a customer's saved address can
    // change or be deleted later, but past orders/invoices must keep showing what was actually used.
    [StringLength(200)]
    public string? ShippingName { get; set; }

    [StringLength(50)]
    public string? ShippingPhone { get; set; }

    [StringLength(200)]
    public string? ShippingStreet { get; set; }

    [StringLength(100)]
    public string? ShippingCity { get; set; }

    [StringLength(50)]
    public string? ShippingState { get; set; }

    [StringLength(20)]
    public string? ShippingPostalCode { get; set; }

    [StringLength(50)]
    public string? ShippingCountry { get; set; }
}