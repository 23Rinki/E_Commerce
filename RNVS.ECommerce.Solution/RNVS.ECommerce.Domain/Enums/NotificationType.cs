namespace RNVS.ECommerce.Domain.Enums;

public enum NotificationType
{
    OrderPlaced,
    OrderShipped,
    OrderDelivered,
    OrderCancelled,
    PaymentSuccess,
    PaymentFailed,
    ProductLowStock,
    ProductOutOfStock,
    NewReview,
    VendorApproved,
    VendorRejected,
    PayoutProcessed,
    SystemNotification
}
