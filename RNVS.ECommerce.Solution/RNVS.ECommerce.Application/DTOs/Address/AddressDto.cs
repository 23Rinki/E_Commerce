namespace RNVS.ECommerce.Application.DTOs.Address;

public class AddressDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string UserId { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public int Type { get; set; }
}
