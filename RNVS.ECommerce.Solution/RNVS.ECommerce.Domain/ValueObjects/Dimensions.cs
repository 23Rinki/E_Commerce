namespace RNVS.ECommerce.Domain.ValueObjects;

public class Dimensions
{
    public decimal Length { get; private set; }
    public decimal Width { get; private set; }
    public decimal Height { get; private set; }
    public string Unit { get; private set; }

    public Dimensions(decimal length, decimal width, decimal height, string unit = "cm")
    {
        Length = length;
        Width = width;
        Height = height;
        Unit = unit;
    }
}