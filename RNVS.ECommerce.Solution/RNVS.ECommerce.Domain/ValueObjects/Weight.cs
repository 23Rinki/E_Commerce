namespace RNVS.ECommerce.Domain.ValueObjects;

public class Weight
{
    public decimal Value { get; private set; }
    public string Unit { get; private set; }

    public Weight(decimal value, string unit = "kg")
    {
        Value = value;
        Unit = unit;
    }
}