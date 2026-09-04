'use client';

import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { amountInWords, money } from '@/lib/receipt/amountInWords';
import { FONTS } from '@/lib/receipt/defaults';
import { buildUpiUri } from '@/lib/receipt/upi';
import type { PreviewFormat, ReceiptState, ResolvedReceiptData } from '@/lib/receipt/types';

interface Props {
  state: ReceiptState;
  data: ResolvedReceiptData;
  format?: PreviewFormat;
  apiBase: string;
}

const dims: Record<PreviewFormat, { wrap: string; header: string }> = {
  paper: { wrap: 'max-w-[210mm] min-h-[297mm] p-10 md:p-14 text-[13px]', header: 'flex items-start gap-5' },
  th80: { wrap: 'w-[320px] p-5 text-[12px] leading-tight', header: 'flex flex-col items-center text-center gap-1' },
  th58: { wrap: 'w-[224px] p-4 text-[11px] leading-tight', header: 'flex flex-col items-center text-center gap-1' },
};

const LiveReceipt = forwardRef<HTMLDivElement, Props>(({ state, data, format = 'paper', apiBase }, ref) => {
  const d = dims[format];
  const { store, style, extras, templateId } = state;
  const thermal = format !== 'paper';
  const isMinimal = templateId === 'minimal';
  const isClassic = templateId === 'classic';
  const font = FONTS.find((f) => f.id === style.fontId)?.css || "'Manrope', sans-serif";
  const { primary, secondary: accent } = style;

  const logoSrc = store.logoUrl ? (store.logoUrl.startsWith('http') || store.logoUrl.startsWith('data:') ? store.logoUrl : `${apiBase}${store.logoUrl}`) : '';
  const signatureSrc = extras.signatureImageUrl
    ? (extras.signatureImageUrl.startsWith('http') || extras.signatureImageUrl.startsWith('data:') ? extras.signatureImageUrl : `${apiBase}${extras.signatureImageUrl}`)
    : '';

  const qrCodeValue = extras.useUpiQr && extras.upiId
    ? buildUpiUri(extras.upiId, store.name, data.grand, `Order ${data.receiptNumber}`)
    : extras.qrValue;

  return (
    <div
      ref={ref}
      className={`bg-white rounded-md paper-shadow relative overflow-hidden ${d.wrap} ${thermal ? 'font-mono-receipt' : ''}`}
      style={{ fontFamily: thermal ? undefined : font, color: '#0F172A' }}
    >
      {/* Header */}
      <div className={d.header}>
        {logoSrc && !thermal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="w-16 h-16 object-contain rounded-md bg-slate-50 p-1 border border-slate-100" />
        )}
        {logoSrc && thermal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="w-14 h-14 object-contain" />
        )}
        <div className={thermal ? '' : 'flex-1'}>
          <div
            className={`font-heading font-bold ${thermal ? 'text-base' : 'text-2xl'}`}
            style={{ color: isClassic && !thermal ? primary : '#0F172A' }}
          >
            {store.name || 'Your Store Name'}
          </div>
          {store.address && <div className={`text-slate-700 ${thermal ? 'text-[10px]' : 'text-xs'} mt-0.5 leading-relaxed`}>{store.address}</div>}
          <div className={`text-slate-700 ${thermal ? 'text-[10px]' : 'text-xs'} mt-0.5`}>
            {[store.phone, store.email, !thermal ? store.website : ''].filter(Boolean).join(' · ')}
          </div>
          {store.gst && <div className={`text-slate-700 ${thermal ? 'text-[10px]' : 'text-xs'} mt-0.5`}>GSTIN: {store.gst}</div>}
        </div>
        {!thermal && (
          <div className="text-right px-4 py-3 rounded-md" style={{ background: isClassic ? accent : 'transparent' }}>
            <div className="text-[10px] uppercase tracking-widest text-slate-700">Tax Invoice</div>
            <div className="font-heading text-lg font-semibold" style={{ color: isClassic ? primary : '#0F172A' }}>Receipt</div>
          </div>
        )}
      </div>

      <div
        className={thermal ? 'my-3 border-t border-dashed border-slate-400' : 'my-6 h-px'}
        style={!thermal ? { background: `linear-gradient(90deg, ${primary}, transparent)` } : {}}
      />

      {/* Bill + Customer */}
      <div className={thermal ? 'space-y-1' : 'grid grid-cols-2 gap-8'}>
        <div className="space-y-1">
          {!thermal && <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Bill details</div>}
          {data.billFields.filter((f) => f.visible).map((f) => (
            <div key={f.id} className={`flex ${thermal ? 'justify-between' : 'gap-3'}`}>
              <span className={`text-slate-700 ${thermal ? '' : 'w-24'}`}>{f.label}</span>
              <span className="font-medium text-slate-900">{f.value || '—'}</span>
            </div>
          ))}
        </div>
        {data.customerFields.some((f) => f.visible) && (
          <div className={thermal ? 'pt-2 border-t border-dashed border-slate-300' : ''}>
            {!thermal && <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Billed to</div>}
            {data.customerFields.filter((f) => f.visible).map((f) => (
              <div key={f.id} className={`flex ${thermal ? 'justify-between' : 'gap-3'}`}>
                <span className={`text-slate-700 ${thermal ? '' : 'w-20'}`}>{f.label}</span>
                <span className="font-medium text-slate-900">{f.value || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items table */}
      <div className={thermal ? 'mt-4' : 'mt-8'}>
        {!thermal ? (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: isMinimal ? 'transparent' : accent, borderBottom: isMinimal ? `1px solid ${primary}` : 'none' }}>
                {['#', 'Item', 'Qty', 'Rate', 'Amount'].map((h, i) => (
                  <th
                    key={h}
                    className={`py-2.5 px-3 text-[11px] uppercase tracking-wider font-semibold ${i >= 2 ? 'text-right' : 'text-left'} ${i === 0 ? 'w-10' : i === 2 ? 'w-16' : i === 3 ? 'w-24' : i === 4 ? 'w-28' : ''}`}
                    style={{ color: primary }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={it.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 px-3 text-slate-700">{String(i + 1).padStart(2, '0')}</td>
                  <td className="py-2.5 px-3 font-medium">{it.name}</td>
                  <td className="py-2.5 px-3 text-right">{it.qty}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{money(it.rate)}</td>
                  <td className="py-2.5 px-3 text-right font-medium tabular-nums">{money(it.qty * it.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>
            <div className="flex justify-between border-t border-b border-dashed border-slate-400 py-1 font-semibold">
              <span>Item</span><span>Qty × Rate</span><span>Amount</span>
            </div>
            {data.items.map((it) => (
              <div key={it.id} className="py-1">
                <div className="flex justify-between">
                  <span className="flex-1 truncate pr-1">{it.name}</span>
                  <span className="tabular-nums">{money(it.qty * it.rate)}</span>
                </div>
                <div className="text-slate-700 text-[10px]">{it.qty} × {money(it.rate)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className={thermal ? 'mt-2 pt-2 border-t border-dashed border-slate-400' : 'mt-6 flex justify-end'}>
        <div className={thermal ? 'space-y-0.5' : 'w-72 space-y-1.5'}>
          {[
            ['Sub Total', data.subTotal, ''],
            data.discount > 0 ? ['Discount', -data.discount, 'text-emerald-600'] : null,
            data.cgst > 0 ? ['CGST', data.cgst, ''] : null,
            data.sgst > 0 ? ['SGST', data.sgst, ''] : null,
            data.igst > 0 ? ['IGST', data.igst, ''] : null,
            data.shipping > 0 ? ['Shipping', data.shipping, ''] : null,
          ].filter(Boolean).map((row, i) => {
            const [label, val, cls] = row as [string, number, string];
            return (
              <div key={i} className="flex justify-between">
                <span className="text-slate-700">{label}</span>
                <span className={`tabular-nums font-medium ${cls}`}>{val < 0 ? '− ' : ''}{money(Math.abs(val))}</span>
              </div>
            );
          })}
          <div
            className={`flex justify-between items-baseline ${thermal ? 'border-t border-dashed border-slate-400 pt-1 mt-1' : 'rounded-md mt-2 px-3 py-2'}`}
            style={!thermal ? { background: isClassic ? accent : '#F1F5F9' } : {}}
          >
            <span className="font-heading font-semibold" style={{ color: !thermal && isClassic ? primary : '#0F172A' }}>Grand Total</span>
            <span
              className={`tabular-nums font-heading font-bold ${thermal ? 'text-sm' : 'text-lg'}`}
              style={{ color: !thermal && isClassic ? primary : '#0F172A' }}
            >
              {money(data.grand)}
            </span>
          </div>
        </div>
      </div>

      <div className={`${thermal ? 'mt-2 text-[10px]' : 'mt-4 text-xs'} text-slate-600 italic`}>
        <span className="text-slate-600 not-italic">In words:</span> {amountInWords(data.grand)}
      </div>

      {/* QR + Barcode + Signature */}
      <div className={`${thermal ? 'mt-4 flex flex-col items-center gap-2' : 'mt-8 grid grid-cols-3 gap-6 items-end'}`}>
        {extras.showQr && qrCodeValue && (
          <div>
            <div className="p-2 bg-white rounded-md inline-block border border-slate-100">
              <QRCodeSVG value={qrCodeValue} size={thermal ? 80 : 96} fgColor={thermal ? '#000' : primary} />
            </div>
            {!thermal && (
              <div className="text-[10px] text-slate-600 mt-1">
                {extras.useUpiQr && extras.upiId ? `Scan to pay ${money(data.grand)}` : 'Scan to view / pay'}
              </div>
            )}
          </div>
        )}
        {extras.showBarcode && (
          <div className={thermal ? 'w-full flex justify-center' : ''}>
            <Barcode
              value={data.barcodeValue}
              displayValue={!thermal}
              height={thermal ? 32 : 40}
              width={thermal ? 1 : 1.4}
              margin={0}
              background="transparent"
              lineColor="#0F172A"
              fontSize={10}
            />
          </div>
        )}
        {!thermal && (
          <div className="text-right">
            {signatureSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureSrc} alt="" className="h-12 inline-block object-contain" />
            ) : extras.signatureText ? (
              <div className="font-signature text-3xl leading-tight" style={{ color: primary }}>{extras.signatureText}</div>
            ) : null}
            <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-600 border-t border-slate-200 pt-1">Authorised signatory</div>
          </div>
        )}
      </div>

      {extras.footerNote && (
        <div className={`${thermal ? 'mt-4 pt-2 border-t border-dashed border-slate-400 text-center text-[10px]' : 'mt-8 pt-4 border-t border-slate-100 text-center text-xs'} text-slate-700`}>
          {extras.footerNote}
        </div>
      )}
    </div>
  );
});
LiveReceipt.displayName = 'LiveReceipt';

export default LiveReceipt;
