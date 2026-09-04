namespace RNVS.ECommerce.Domain.Enums;

public enum InventoryTransactionType
{
    Purchase = 1,    // Stock increase
    Sale = 2,        // Stock decrease
    Adjustment = 3,  // Manual adjustment
    Return = 4,      // Customer return
    Damage = 5,      // Damaged goods
    Transfer = 6     // Warehouse transfer
}