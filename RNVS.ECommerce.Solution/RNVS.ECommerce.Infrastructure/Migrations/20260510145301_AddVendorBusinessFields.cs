using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RNVS.ECommerce.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVendorBusinessFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CartItems_Carts_CartId",
                table: "CartItems");

            migrationBuilder.DropForeignKey(
                name: "FK_CartItems_Products_ProductId",
                table: "CartItems");

            migrationBuilder.DropForeignKey(
                name: "FK_CompanyProfiles_AspNetUsers_UserId",
                table: "CompanyProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductImages_Products_ProductId",
                table: "ProductImages");

            migrationBuilder.DropTable(
                name: "BrandingSettings");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "CustomReceipts");

            migrationBuilder.DropTable(
                name: "Employees");

            migrationBuilder.DropTable(
                name: "InventoryTransactions");

            migrationBuilder.DropTable(
                name: "InvoiceTemplates");

            migrationBuilder.DropTable(
                name: "ProductViewHistories");

            migrationBuilder.DropTable(
                name: "Stocks");

            migrationBuilder.DropTable(
                name: "Wishlists");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VendorPayouts",
                table: "VendorPayouts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VendorPayoutItems",
                table: "VendorPayoutItems");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Reviews",
                table: "Reviews");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductVariants",
                table: "ProductVariants");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Products",
                table: "Products");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductImages",
                table: "ProductImages");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PlatformSettings",
                table: "PlatformSettings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Payments",
                table: "Payments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PaymentMethods",
                table: "PaymentMethods");

            migrationBuilder.DropPrimaryKey(
                name: "PK_OrderStatusHistories",
                table: "OrderStatusHistories");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Orders",
                table: "Orders");

            migrationBuilder.DropPrimaryKey(
                name: "PK_OrderItems",
                table: "OrderItems");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Notifications",
                table: "Notifications");

            migrationBuilder.DropPrimaryKey(
                name: "PK_EmailQueues",
                table: "EmailQueues");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CompanyProfiles",
                table: "CompanyProfiles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Carts",
                table: "Carts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CartItems",
                table: "CartItems");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Addresses",
                table: "Addresses");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ActivityLogs",
                table: "ActivityLogs");

            migrationBuilder.RenameTable(
                name: "VendorPayouts",
                newName: "VendorPayout");

            migrationBuilder.RenameTable(
                name: "VendorPayoutItems",
                newName: "VendorPayoutItem");

            migrationBuilder.RenameTable(
                name: "Reviews",
                newName: "Review");

            migrationBuilder.RenameTable(
                name: "ProductVariants",
                newName: "ProductVariant");

            migrationBuilder.RenameTable(
                name: "Products",
                newName: "Product");

            migrationBuilder.RenameTable(
                name: "ProductImages",
                newName: "ProductImage");

            migrationBuilder.RenameTable(
                name: "PlatformSettings",
                newName: "PlatformSetting");

            migrationBuilder.RenameTable(
                name: "Payments",
                newName: "Payment");

            migrationBuilder.RenameTable(
                name: "PaymentMethods",
                newName: "PaymentMethod");

            migrationBuilder.RenameTable(
                name: "OrderStatusHistories",
                newName: "OrderStatusHistory");

            migrationBuilder.RenameTable(
                name: "Orders",
                newName: "Order");

            migrationBuilder.RenameTable(
                name: "OrderItems",
                newName: "OrderItem");

            migrationBuilder.RenameTable(
                name: "Notifications",
                newName: "Notification");

            migrationBuilder.RenameTable(
                name: "EmailQueues",
                newName: "EmailQueue");

            migrationBuilder.RenameTable(
                name: "CompanyProfiles",
                newName: "CompanyProfile");

            migrationBuilder.RenameTable(
                name: "Carts",
                newName: "Cart");

            migrationBuilder.RenameTable(
                name: "CartItems",
                newName: "CartItem");

            migrationBuilder.RenameTable(
                name: "Addresses",
                newName: "Address");

            migrationBuilder.RenameTable(
                name: "ActivityLogs",
                newName: "ActivityLog");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayouts_VendorId",
                table: "VendorPayout",
                newName: "IX_VendorPayout_VendorId");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayouts_Status",
                table: "VendorPayout",
                newName: "IX_VendorPayout_Status");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayouts_PayoutNumber",
                table: "VendorPayout",
                newName: "IX_VendorPayout_PayoutNumber");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayouts_CreatedAt",
                table: "VendorPayout",
                newName: "IX_VendorPayout_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayoutItems_PayoutId",
                table: "VendorPayoutItem",
                newName: "IX_VendorPayoutItem_PayoutId");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayoutItems_OrderId",
                table: "VendorPayoutItem",
                newName: "IX_VendorPayoutItem_OrderId");

            migrationBuilder.RenameIndex(
                name: "IX_Reviews_UserId",
                table: "Review",
                newName: "IX_Review_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Reviews_ProductId",
                table: "Review",
                newName: "IX_Review_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_ProductVariants_SKU",
                table: "ProductVariant",
                newName: "IX_ProductVariant_SKU");

            migrationBuilder.RenameIndex(
                name: "IX_ProductVariants_ProductId",
                table: "ProductVariant",
                newName: "IX_ProductVariant_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_Products_VendorId",
                table: "Product",
                newName: "IX_Product_VendorId");

            migrationBuilder.RenameIndex(
                name: "IX_Products_Name",
                table: "Product",
                newName: "IX_Product_Name");

            migrationBuilder.RenameIndex(
                name: "IX_Products_CategoryId",
                table: "Product",
                newName: "IX_Product_CategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_ProductImages_ProductId",
                table: "ProductImage",
                newName: "IX_ProductImage_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformSettings_Key",
                table: "PlatformSetting",
                newName: "IX_PlatformSetting_Key");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformSettings_Category",
                table: "PlatformSetting",
                newName: "IX_PlatformSetting_Category");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_TransactionId",
                table: "Payment",
                newName: "IX_Payment_TransactionId");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_OrderId",
                table: "Payment",
                newName: "IX_Payment_OrderId");

            migrationBuilder.RenameIndex(
                name: "IX_OrderStatusHistories_OrderId",
                table: "OrderStatusHistory",
                newName: "IX_OrderStatusHistory_OrderId");

            migrationBuilder.RenameIndex(
                name: "IX_OrderStatusHistories_CreatedAt",
                table: "OrderStatusHistory",
                newName: "IX_OrderStatusHistory_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_Orders_UserId",
                table: "Order",
                newName: "IX_Order_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Orders_OrderNumber",
                table: "Order",
                newName: "IX_Order_OrderNumber");

            migrationBuilder.RenameIndex(
                name: "IX_Orders_CreatedAt",
                table: "Order",
                newName: "IX_Order_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_Notifications_UserId",
                table: "Notification",
                newName: "IX_Notification_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Notifications_IsRead",
                table: "Notification",
                newName: "IX_Notification_IsRead");

            migrationBuilder.RenameIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notification",
                newName: "IX_Notification_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_EmailQueues_Status",
                table: "EmailQueue",
                newName: "IX_EmailQueue_Status");

            migrationBuilder.RenameIndex(
                name: "IX_EmailQueues_CreatedAt",
                table: "EmailQueue",
                newName: "IX_EmailQueue_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_CompanyProfiles_UserId",
                table: "CompanyProfile",
                newName: "IX_CompanyProfile_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Carts_UserId",
                table: "Cart",
                newName: "IX_Cart_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_CartItems_ProductId",
                table: "CartItem",
                newName: "IX_CartItem_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_CartItems_CartId",
                table: "CartItem",
                newName: "IX_CartItem_CartId");

            migrationBuilder.RenameIndex(
                name: "IX_ActivityLogs_UserId",
                table: "ActivityLog",
                newName: "IX_ActivityLog_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_ActivityLogs_CreatedAt",
                table: "ActivityLog",
                newName: "IX_ActivityLog_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_ActivityLogs_Action",
                table: "ActivityLog",
                newName: "IX_ActivityLog_Action");

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "UserBehaviors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyPanNumber",
                table: "TenantRegistrations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GstNumber",
                table: "TenantRegistrations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UdyamCertificateNumber",
                table: "TenantRegistrations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "VendorPayoutItem",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Review",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "ProductVariant",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountPrice",
                table: "Product",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "ProductImage",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "PlatformSetting",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Payment",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "PaymentMethod",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "OrderStatusHistory",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Order",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "OrderItem",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Notification",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "EmailQueue",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "CompanyProfile",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Cart",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "CartItem",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "Address",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorId",
                table: "ActivityLog",
                type: "text",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_VendorPayout",
                table: "VendorPayout",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VendorPayoutItem",
                table: "VendorPayoutItem",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Review",
                table: "Review",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductVariant",
                table: "ProductVariant",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Product",
                table: "Product",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductImage",
                table: "ProductImage",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PlatformSetting",
                table: "PlatformSetting",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Payment",
                table: "Payment",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PaymentMethod",
                table: "PaymentMethod",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_OrderStatusHistory",
                table: "OrderStatusHistory",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Order",
                table: "Order",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_OrderItem",
                table: "OrderItem",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Notification",
                table: "Notification",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EmailQueue",
                table: "EmailQueue",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CompanyProfile",
                table: "CompanyProfile",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Cart",
                table: "Cart",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CartItem",
                table: "CartItem",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Address",
                table: "Address",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ActivityLog",
                table: "ActivityLog",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "EmployeeEmailIndex",
                columns: table => new
                {
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    VendorId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeEmailIndex", x => x.Email);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEmailIndex_VendorId",
                table: "EmployeeEmailIndex",
                column: "VendorId");

            migrationBuilder.AddForeignKey(
                name: "FK_CartItem_Cart_CartId",
                table: "CartItem",
                column: "CartId",
                principalTable: "Cart",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CartItem_Product_ProductId",
                table: "CartItem",
                column: "ProductId",
                principalTable: "Product",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CompanyProfile_AspNetUsers_UserId",
                table: "CompanyProfile",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductImage_Product_ProductId",
                table: "ProductImage",
                column: "ProductId",
                principalTable: "Product",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CartItem_Cart_CartId",
                table: "CartItem");

            migrationBuilder.DropForeignKey(
                name: "FK_CartItem_Product_ProductId",
                table: "CartItem");

            migrationBuilder.DropForeignKey(
                name: "FK_CompanyProfile_AspNetUsers_UserId",
                table: "CompanyProfile");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductImage_Product_ProductId",
                table: "ProductImage");

            migrationBuilder.DropTable(
                name: "EmployeeEmailIndex");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VendorPayoutItem",
                table: "VendorPayoutItem");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VendorPayout",
                table: "VendorPayout");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Review",
                table: "Review");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductVariant",
                table: "ProductVariant");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductImage",
                table: "ProductImage");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Product",
                table: "Product");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PlatformSetting",
                table: "PlatformSetting");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PaymentMethod",
                table: "PaymentMethod");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Payment",
                table: "Payment");

            migrationBuilder.DropPrimaryKey(
                name: "PK_OrderStatusHistory",
                table: "OrderStatusHistory");

            migrationBuilder.DropPrimaryKey(
                name: "PK_OrderItem",
                table: "OrderItem");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Order",
                table: "Order");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Notification",
                table: "Notification");

            migrationBuilder.DropPrimaryKey(
                name: "PK_EmailQueue",
                table: "EmailQueue");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CompanyProfile",
                table: "CompanyProfile");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CartItem",
                table: "CartItem");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Cart",
                table: "Cart");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Address",
                table: "Address");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ActivityLog",
                table: "ActivityLog");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "UserBehaviors");

            migrationBuilder.DropColumn(
                name: "CompanyPanNumber",
                table: "TenantRegistrations");

            migrationBuilder.DropColumn(
                name: "GstNumber",
                table: "TenantRegistrations");

            migrationBuilder.DropColumn(
                name: "UdyamCertificateNumber",
                table: "TenantRegistrations");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "VendorPayoutItem");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Review");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "ProductVariant");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "ProductImage");

            migrationBuilder.DropColumn(
                name: "DiscountPrice",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "PlatformSetting");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "PaymentMethod");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Payment");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "OrderStatusHistory");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Notification");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "EmailQueue");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "CompanyProfile");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "CartItem");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Cart");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Address");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "ActivityLog");

            migrationBuilder.RenameTable(
                name: "VendorPayoutItem",
                newName: "VendorPayoutItems");

            migrationBuilder.RenameTable(
                name: "VendorPayout",
                newName: "VendorPayouts");

            migrationBuilder.RenameTable(
                name: "Review",
                newName: "Reviews");

            migrationBuilder.RenameTable(
                name: "ProductVariant",
                newName: "ProductVariants");

            migrationBuilder.RenameTable(
                name: "ProductImage",
                newName: "ProductImages");

            migrationBuilder.RenameTable(
                name: "Product",
                newName: "Products");

            migrationBuilder.RenameTable(
                name: "PlatformSetting",
                newName: "PlatformSettings");

            migrationBuilder.RenameTable(
                name: "PaymentMethod",
                newName: "PaymentMethods");

            migrationBuilder.RenameTable(
                name: "Payment",
                newName: "Payments");

            migrationBuilder.RenameTable(
                name: "OrderStatusHistory",
                newName: "OrderStatusHistories");

            migrationBuilder.RenameTable(
                name: "OrderItem",
                newName: "OrderItems");

            migrationBuilder.RenameTable(
                name: "Order",
                newName: "Orders");

            migrationBuilder.RenameTable(
                name: "Notification",
                newName: "Notifications");

            migrationBuilder.RenameTable(
                name: "EmailQueue",
                newName: "EmailQueues");

            migrationBuilder.RenameTable(
                name: "CompanyProfile",
                newName: "CompanyProfiles");

            migrationBuilder.RenameTable(
                name: "CartItem",
                newName: "CartItems");

            migrationBuilder.RenameTable(
                name: "Cart",
                newName: "Carts");

            migrationBuilder.RenameTable(
                name: "Address",
                newName: "Addresses");

            migrationBuilder.RenameTable(
                name: "ActivityLog",
                newName: "ActivityLogs");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayoutItem_PayoutId",
                table: "VendorPayoutItems",
                newName: "IX_VendorPayoutItems_PayoutId");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayoutItem_OrderId",
                table: "VendorPayoutItems",
                newName: "IX_VendorPayoutItems_OrderId");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayout_VendorId",
                table: "VendorPayouts",
                newName: "IX_VendorPayouts_VendorId");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayout_Status",
                table: "VendorPayouts",
                newName: "IX_VendorPayouts_Status");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayout_PayoutNumber",
                table: "VendorPayouts",
                newName: "IX_VendorPayouts_PayoutNumber");

            migrationBuilder.RenameIndex(
                name: "IX_VendorPayout_CreatedAt",
                table: "VendorPayouts",
                newName: "IX_VendorPayouts_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_Review_UserId",
                table: "Reviews",
                newName: "IX_Reviews_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Review_ProductId",
                table: "Reviews",
                newName: "IX_Reviews_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_ProductVariant_SKU",
                table: "ProductVariants",
                newName: "IX_ProductVariants_SKU");

            migrationBuilder.RenameIndex(
                name: "IX_ProductVariant_ProductId",
                table: "ProductVariants",
                newName: "IX_ProductVariants_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_ProductImage_ProductId",
                table: "ProductImages",
                newName: "IX_ProductImages_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_Product_VendorId",
                table: "Products",
                newName: "IX_Products_VendorId");

            migrationBuilder.RenameIndex(
                name: "IX_Product_Name",
                table: "Products",
                newName: "IX_Products_Name");

            migrationBuilder.RenameIndex(
                name: "IX_Product_CategoryId",
                table: "Products",
                newName: "IX_Products_CategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformSetting_Key",
                table: "PlatformSettings",
                newName: "IX_PlatformSettings_Key");

            migrationBuilder.RenameIndex(
                name: "IX_PlatformSetting_Category",
                table: "PlatformSettings",
                newName: "IX_PlatformSettings_Category");

            migrationBuilder.RenameIndex(
                name: "IX_Payment_TransactionId",
                table: "Payments",
                newName: "IX_Payments_TransactionId");

            migrationBuilder.RenameIndex(
                name: "IX_Payment_OrderId",
                table: "Payments",
                newName: "IX_Payments_OrderId");

            migrationBuilder.RenameIndex(
                name: "IX_OrderStatusHistory_OrderId",
                table: "OrderStatusHistories",
                newName: "IX_OrderStatusHistories_OrderId");

            migrationBuilder.RenameIndex(
                name: "IX_OrderStatusHistory_CreatedAt",
                table: "OrderStatusHistories",
                newName: "IX_OrderStatusHistories_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_Order_UserId",
                table: "Orders",
                newName: "IX_Orders_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Order_OrderNumber",
                table: "Orders",
                newName: "IX_Orders_OrderNumber");

            migrationBuilder.RenameIndex(
                name: "IX_Order_CreatedAt",
                table: "Orders",
                newName: "IX_Orders_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_Notification_UserId",
                table: "Notifications",
                newName: "IX_Notifications_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Notification_IsRead",
                table: "Notifications",
                newName: "IX_Notifications_IsRead");

            migrationBuilder.RenameIndex(
                name: "IX_Notification_CreatedAt",
                table: "Notifications",
                newName: "IX_Notifications_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_EmailQueue_Status",
                table: "EmailQueues",
                newName: "IX_EmailQueues_Status");

            migrationBuilder.RenameIndex(
                name: "IX_EmailQueue_CreatedAt",
                table: "EmailQueues",
                newName: "IX_EmailQueues_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_CompanyProfile_UserId",
                table: "CompanyProfiles",
                newName: "IX_CompanyProfiles_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_CartItem_ProductId",
                table: "CartItems",
                newName: "IX_CartItems_ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_CartItem_CartId",
                table: "CartItems",
                newName: "IX_CartItems_CartId");

            migrationBuilder.RenameIndex(
                name: "IX_Cart_UserId",
                table: "Carts",
                newName: "IX_Carts_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_ActivityLog_UserId",
                table: "ActivityLogs",
                newName: "IX_ActivityLogs_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_ActivityLog_CreatedAt",
                table: "ActivityLogs",
                newName: "IX_ActivityLogs_CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_ActivityLog_Action",
                table: "ActivityLogs",
                newName: "IX_ActivityLogs_Action");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VendorPayoutItems",
                table: "VendorPayoutItems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VendorPayouts",
                table: "VendorPayouts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Reviews",
                table: "Reviews",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductVariants",
                table: "ProductVariants",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductImages",
                table: "ProductImages",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Products",
                table: "Products",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PlatformSettings",
                table: "PlatformSettings",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PaymentMethods",
                table: "PaymentMethods",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Payments",
                table: "Payments",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_OrderStatusHistories",
                table: "OrderStatusHistories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_OrderItems",
                table: "OrderItems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Orders",
                table: "Orders",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Notifications",
                table: "Notifications",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EmailQueues",
                table: "EmailQueues",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CompanyProfiles",
                table: "CompanyProfiles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CartItems",
                table: "CartItems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Carts",
                table: "Carts",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Addresses",
                table: "Addresses",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ActivityLogs",
                table: "ActivityLogs",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "BrandingSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FontFamily = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LogoSize = table.Column<int>(type: "integer", nullable: false),
                    LogoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PrimaryColor = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    SecondaryColor = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    VendorId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BrandingSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomReceipts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CustomFooterText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    InvoiceTemplateId = table.Column<int>(type: "integer", nullable: false),
                    ShowCompanyLogo = table.Column<bool>(type: "boolean", nullable: false),
                    ShowTaxDetails = table.Column<bool>(type: "boolean", nullable: false),
                    VendorId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomReceipts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    VendorId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Designation = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EmployeeCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    JoinedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Permissions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Salary = table.Column<decimal>(type: "numeric", nullable: false),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TerminatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Employees_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Employees_AspNetUsers_VendorId",
                        column: x => x.VendorId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InventoryTransactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryTransactions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    HtmlTemplate = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductViewHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    ViewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductViewHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductViewHistories_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Stocks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CurrentQuantity = table.Column<int>(type: "integer", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MinimumThreshold = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    ReservedQuantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stocks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Wishlists",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Wishlists", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Employees_UserId",
                table: "Employees",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_VendorId",
                table: "Employees",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductViewHistories_ProductId",
                table: "ProductViewHistories",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_CartItems_Carts_CartId",
                table: "CartItems",
                column: "CartId",
                principalTable: "Carts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CartItems_Products_ProductId",
                table: "CartItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CompanyProfiles_AspNetUsers_UserId",
                table: "CompanyProfiles",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductImages_Products_ProductId",
                table: "ProductImages",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
