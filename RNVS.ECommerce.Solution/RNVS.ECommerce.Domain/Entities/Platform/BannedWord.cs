using System.ComponentModel.DataAnnotations;

namespace RNVS.ECommerce.Domain.Entities.Platform;

/// <summary>
/// Admin-editable list of words that auto-flag a product's name/description on submission.
/// Lives in the Master DB so it can be updated without redeploying.
/// </summary>
public class BannedWord
{
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Word { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
