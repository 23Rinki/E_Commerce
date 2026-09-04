using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Application.DTOs.Wishlist;

public class AddToWishlistDto
{
    [Required]
    public int ProductId { get; set; }
}
