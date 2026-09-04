export type TemplateId = 'classic' | 'standard' | 'thermal' | 'minimal';
export type PreviewFormat = 'paper' | 'th80' | 'th58';

export interface BillField {
  id: string;
  label: string;
  value: string;
  visible: boolean;
}

export interface SampleItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
}

export interface ReceiptStyle {
  primary: string;
  secondary: string;
  fontId: string;
}

export interface ReceiptStore {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gst: string;
  logoUrl: string;
}

export interface ReceiptExtras {
  showQr: boolean;
  qrValue: string;
  useUpiQr: boolean; // when true, the QR encodes a upi://pay deep link (real amount + order number) instead of qrValue
  upiId: string; // vendor's UPI VPA, e.g. storename@okhdfcbank
  showBarcode: boolean;
  signatureText: string;
  signatureImageUrl: string;
  footerNote: string;
}

export interface ReceiptTotalsConfig {
  discountPct: number; // sample-preview only — real orders have no discount concept
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
}

export interface ReceiptState {
  templateId: TemplateId;
  style: ReceiptStyle;
  store: ReceiptStore;
  billFields: BillField[];
  customerFields: BillField[];
  items: SampleItem[]; // used for preview only when no real order is selected
  totals: ReceiptTotalsConfig;
  extras: ReceiptExtras;
}

// A real vendor order, as returned by vendorOrdersApi.getAll()
export interface VendorOrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface VendorOrder {
  id: number;
  orderNumber: string;
  status: number; // 1 Pending, 2 Processing, 3 Shipped, 4 Delivered, 5 Cancelled, 6 Refunded, 7 Returned
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  subTotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  createdAt: string;
  items: VendorOrderItem[];
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingStreet?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostalCode?: string | null;
}

// What actually gets rendered — either the sample/preview data or a real order's data
export interface ResolvedReceiptData {
  billFields: BillField[];
  customerFields: BillField[];
  items: { id: string | number; name: string; qty: number; rate: number }[];
  subTotal: number;
  discount: number;
  tax: number;
  shipping: number;
  grand: number;
  cgst: number;
  sgst: number;
  igst: number;
  barcodeValue: string;
  receiptNumber: string;
  itemsEditable: boolean;
}
