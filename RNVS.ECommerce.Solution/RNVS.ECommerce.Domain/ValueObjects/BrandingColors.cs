namespace RNVS.ECommerce.Domain.ValueObjects;

public class BrandingColors
{
    public string Primary { get; private set; }
    public string Secondary { get; private set; }

    public BrandingColors(string primary, string secondary)
    {
        Primary = primary;
        Secondary = secondary;
    }

    public static BrandingColors Default => new BrandingColors("#000000", "#FFFFFF");
}