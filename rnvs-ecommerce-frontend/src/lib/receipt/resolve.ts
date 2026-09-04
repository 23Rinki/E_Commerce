import type { BillField, ReceiptState, ResolvedReceiptData, VendorOrder } from './types';

function fillBillField(f: BillField, order: VendorOrder | null): BillField {
  if (!order) return f;
  if (f.value.trim()) return f; // vendor typed a fixed value — keep it
  if (f.id === 'date') return { ...f, value: new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) };
  if (f.id === 'receipt') return { ...f, value: order.orderNumber };
  return f; // no real-order equivalent (e.g. Cashier) — stays whatever the vendor typed, or blank
}

function fillCustomerField(f: BillField, order: VendorOrder | null): BillField {
  if (!order) return f;
  if (f.value.trim()) return f;
  if (f.id === 'name') return { ...f, value: order.shippingName || order.customerName || '—' };
  if (f.id === 'phone') return { ...f, value: order.shippingPhone || order.customerPhone || '—' };
  if (f.id === 'email') return { ...f, value: order.customerEmail || '—' };
  if (f.id === 'address') {
    const addr = [order.shippingStreet, order.shippingCity, order.shippingState, order.shippingPostalCode]
      .filter(Boolean).join(', ');
    return { ...f, value: addr || '—' };
  }
  return f; // Company / PAN — no real-order equivalent
}

export function resolveReceiptData(state: ReceiptState, order: VendorOrder | null): ResolvedReceiptData {
  const billFields = state.billFields.map((f) => fillBillField(f, order));
  const customerFields = state.customerFields.map((f) => fillCustomerField(f, order));

  if (order) {
    const sumPct = state.totals.cgstPct + state.totals.sgstPct + state.totals.igstPct;
    const ratio = (pct: number) => (sumPct > 0 ? pct / sumPct : 0);
    const tax = order.taxAmount;
    return {
      billFields,
      customerFields,
      items: order.items.map((i) => ({ id: i.id, name: i.productName, qty: i.quantity, rate: i.unitPrice })),
      subTotal: order.subTotal,
      discount: 0,
      tax,
      shipping: order.shippingCost,
      grand: order.totalAmount,
      cgst: tax * ratio(state.totals.cgstPct),
      sgst: tax * ratio(state.totals.sgstPct),
      igst: tax * ratio(state.totals.igstPct),
      barcodeValue: order.orderNumber,
      receiptNumber: order.orderNumber,
      itemsEditable: false,
    };
  }

  const subTotal = state.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const discount = (subTotal * state.totals.discountPct) / 100;
  const taxable = subTotal - discount;
  const cgst = (taxable * state.totals.cgstPct) / 100;
  const sgst = (taxable * state.totals.sgstPct) / 100;
  const igst = (taxable * state.totals.igstPct) / 100;

  return {
    billFields,
    customerFields,
    items: state.items,
    subTotal,
    discount,
    tax: cgst + sgst + igst,
    shipping: 0,
    grand: taxable + cgst + sgst + igst,
    cgst,
    sgst,
    igst,
    barcodeValue: 'SAMPLE0000',
    receiptNumber: 'SAMPLE-0001',
    itemsEditable: true,
  };
}
