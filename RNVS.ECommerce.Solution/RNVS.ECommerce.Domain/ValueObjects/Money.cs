using System.ComponentModel.DataAnnotations.Schema;

namespace RNVS.ECommerce.Domain.ValueObjects;

public class Money
{
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; private set; }

    [Column(TypeName = "varchar(3)")]
    public string Currency { get; private set; }

    public Money(decimal amount, string currency = "USD")
    {
        Amount = amount;
        Currency = currency;
    }

    public static Money Zero => new Money(0);
}