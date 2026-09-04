using System.ComponentModel.DataAnnotations;
using RNVS.ECommerce.Domain.Enums;

namespace RNVS.ECommerce.Domain.Entities.System;

public class PlatformSetting
{
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Key { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [StringLength(50)]
    public string Category { get; set; } = "General";

    public SettingDataType DataType { get; set; } = SettingDataType.String;

    public string? VendorId { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
