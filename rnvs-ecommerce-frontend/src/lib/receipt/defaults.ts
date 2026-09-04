import type { ReceiptState, TemplateId } from './types';

export const TEMPLATES: { id: TemplateId; name: string; desc: string; accent: string }[] = [
  { id: 'classic', name: 'Classic', desc: 'Light-blue accent header, print A4', accent: '#3B5BDB' },
  { id: 'standard', name: 'Standard', desc: 'Modern minimal layout for A4 paper', accent: '#0F172A' },
  { id: 'thermal', name: 'Thermal', desc: 'Optimised for POS receipt printers', accent: '#111827' },
  { id: 'minimal', name: 'Minimal', desc: 'Clean typographic bill, no chrome', accent: '#64748B' },
];

export const FONTS: { id: string; label: string; css: string }[] = [
  { id: 'manrope', label: 'Manrope', css: "'Manrope', sans-serif" },
  { id: 'outfit', label: 'Outfit', css: "'Outfit', sans-serif" },
  { id: 'inter', label: 'Inter', css: "'Inter', sans-serif" },
  { id: 'serif', label: 'Serif', css: "'Georgia', serif" },
  { id: 'mono', label: 'Monospace', css: "'JetBrains Mono', monospace" },
];

export const DEFAULT_BILL_FIELDS = [
  { id: 'date', label: 'Date', value: '', visible: true },
  { id: 'receipt', label: 'Receipt #', value: '', visible: true },
  { id: 'cashier', label: 'Cashier', value: '', visible: true },
];

export const DEFAULT_CUSTOMER_FIELDS = [
  { id: 'name', label: 'Name', value: '', visible: true },
  { id: 'phone', label: 'Phone', value: '', visible: true },
  { id: 'email', label: 'Email', value: '', visible: false },
  { id: 'address', label: 'Address', value: '', visible: false },
  { id: 'company', label: 'Company', value: '', visible: false },
  { id: 'pan', label: 'PAN', value: '', visible: false },
];

// Sample items shown only while designing the template (no real order picked yet)
export const SAMPLE_ITEMS = [
  { id: 'sample-1', name: 'Sample Product A', qty: 2, rate: 260 },
  { id: 'sample-2', name: 'Sample Product B', qty: 1, rate: 850 },
  { id: 'sample-3', name: 'Sample Product C', qty: 3, rate: 180 },
];

export const DEFAULT_STATE: ReceiptState = {
  templateId: 'classic',
  style: { primary: '#3B5BDB', secondary: '#E6F0FA', fontId: 'manrope' },
  store: {
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    gst: '',
    logoUrl: '',
  },
  billFields: DEFAULT_BILL_FIELDS,
  customerFields: DEFAULT_CUSTOMER_FIELDS,
  items: SAMPLE_ITEMS,
  totals: { discountPct: 0, cgstPct: 50, sgstPct: 50, igstPct: 0 },
  extras: {
    showQr: true,
    qrValue: '',
    useUpiQr: false,
    upiId: '',
    showBarcode: true,
    signatureText: '',
    signatureImageUrl: '',
    footerNote: 'Thank you for shopping with us!',
  },
};
