import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { amountInWords } from './amountInWords';
import { buildUpiUri } from './upi';
import type { ReceiptState, ResolvedReceiptData } from './types';

export class QzNotAvailableError extends Error {}

const STORAGE_KEY_PREFIX = 'rnvs_qz_printer_';

// Cheap/generic ESC/POS printers only reliably support the CP437 codepage, which has no ₹ glyph —
// use "Rs." on the raw ticket instead of the Unicode rupee sign to avoid garbled currency symbols.
const moneyPlain = (n: number) => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function getQz() {
  const { default: qz } = await import('qz-tray');
  return qz;
}

let connecting: Promise<void> | null = null;

export async function ensureQzConnected(): Promise<void> {
  const qz = await getQz();
  if (qz.websocket.isActive()) return;
  if (!connecting) {
    connecting = qz.websocket.connect().finally(() => { connecting = null; });
  }
  try {
    await connecting;
  } catch {
    throw new QzNotAvailableError(
      'Could not connect to QZ Tray. Make sure it is installed and running (look for its icon in your system tray), then try again.',
    );
  }
}

export async function listPrinters(): Promise<string[]> {
  const qz = await getQz();
  const result = await qz.printers.find();
  return Array.isArray(result) ? result : [result];
}

export function getSavedPrinter(widthMm: 80 | 58): string | null {
  try { return localStorage.getItem(STORAGE_KEY_PREFIX + widthMm); } catch { return null; }
}

export function savePrinter(widthMm: 80 | 58, printerName: string): void {
  try { localStorage.setItem(STORAGE_KEY_PREFIX + widthMm, printerName); } catch { /* ignore */ }
}

function buildEscPosReceipt(state: ReceiptState, data: ResolvedReceiptData, widthMm: 80 | 58): Uint8Array {
  const columns = widthMm === 80 ? 48 : 32;
  const encoder = new ReceiptPrinterEncoder({ language: 'esc-pos', columns });

  const totalsRow = (label: string, val: number) => {
    const amount = moneyPlain(val);
    const gap = Math.max(1, columns - label.length - amount.length);
    encoder.line(label + ' '.repeat(gap) + amount);
  };

  encoder.initialize().codepage('cp437').align('center');

  if (state.store.name) encoder.bold(true).line(state.store.name).bold(false);
  if (state.store.address) encoder.line(state.store.address);
  const contact = [state.store.phone, state.store.email].filter(Boolean).join(' | ');
  if (contact) encoder.line(contact);
  if (state.store.gst) encoder.line(`GSTIN: ${state.store.gst}`);

  encoder.align('left').rule();

  data.billFields.filter((f) => f.visible).forEach((f) => encoder.line(`${f.label}: ${f.value || '-'}`));
  const visibleCustomerFields = data.customerFields.filter((f) => f.visible);
  if (visibleCustomerFields.length) {
    encoder.rule();
    visibleCustomerFields.forEach((f) => encoder.line(`${f.label}: ${f.value || '-'}`));
  }

  encoder.rule();
  data.items.forEach((it) => {
    encoder.line(it.name);
    totalsRow(`  ${it.qty} x ${moneyPlain(it.rate)}`, it.qty * it.rate);
  });
  encoder.rule();

  totalsRow('Sub Total', data.subTotal);
  if (data.discount > 0) totalsRow('Discount', -data.discount);
  if (data.cgst > 0) totalsRow('CGST', data.cgst);
  if (data.sgst > 0) totalsRow('SGST', data.sgst);
  if (data.igst > 0) totalsRow('IGST', data.igst);
  if (data.shipping > 0) totalsRow('Shipping', data.shipping);

  encoder.bold(true);
  totalsRow('Grand Total', data.grand);
  encoder.bold(false);
  encoder.line(amountInWords(data.grand));

  if (state.extras.showBarcode && data.barcodeValue) {
    encoder.align('center').barcode(data.barcodeValue, 'code128', 50);
  }
  const qrCodeValue = state.extras.useUpiQr && state.extras.upiId
    ? buildUpiUri(state.extras.upiId, state.store.name, data.grand, `Order ${data.receiptNumber}`)
    : state.extras.qrValue;
  if (state.extras.showQr && qrCodeValue) {
    encoder.align('center').qrcode(qrCodeValue);
  }
  if (state.extras.footerNote) {
    encoder.align('center').line(state.extras.footerNote);
  }

  encoder.newline(3).cut();

  return encoder.encode();
}

export async function printRawReceipt(
  state: ReceiptState,
  data: ResolvedReceiptData,
  widthMm: 80 | 58,
  printerName: string,
): Promise<void> {
  const qz = await getQz();
  await ensureQzConnected();
  const bytes = buildEscPosReceipt(state, data, widthMm);
  const config = qz.configs.create(printerName);
  await qz.print(config, [{ type: 'raw', format: 'command', data: Array.from(bytes) }]);
}
