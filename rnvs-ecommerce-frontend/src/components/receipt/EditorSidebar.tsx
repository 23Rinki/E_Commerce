'use client';

import { ReactNode } from 'react';
import {
  LayoutTemplate, Store, Palette, Receipt, Users, Package, QrCode, PenLine, ClipboardList, Download,
} from 'lucide-react';
import Section from './Section';
import TemplatePicker from './TemplatePicker';
import LogoUploader from './LogoUploader';
import DynamicFields from './DynamicFields';
import ItemsEditor from './ItemsEditor';
import { FONTS } from '@/lib/receipt/defaults';
import type { ReceiptState, VendorOrder } from '@/lib/receipt/types';

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#3B5BDB] focus:ring-2 focus:ring-[#3B5BDB]/10';

const ColorPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2">
    <div className="relative w-10 h-9 rounded-md overflow-hidden border border-slate-200 flex-shrink-0">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-[140%] h-[140%] cursor-pointer" />
    </div>
    <input value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} font-mono text-xs`} />
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[#3B5BDB]' : 'bg-slate-300'}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
  </button>
);

interface Props {
  state: ReceiptState;
  set: (patch: Partial<ReceiptState>) => void;
  apiBase: string;
  orders: VendorOrder[];
  selectedOrderId: number | '';
  setSelectedOrderId: (id: number | '') => void;
  logoUploading: boolean;
  onUploadLogo: (file: File) => void;
  onRemoveLogo: () => void;
  signatureUploading: boolean;
  onUploadSignature: (file: File) => void;
  onRemoveSignature: () => void;
  onError: (message: string) => void;
  onDownloadRealPdf: () => void;
  downloadingRealPdf: boolean;
}

export default function EditorSidebar({
  state, set, apiBase, orders, selectedOrderId, setSelectedOrderId,
  logoUploading, onUploadLogo, onRemoveLogo,
  signatureUploading, onUploadSignature, onRemoveSignature, onError,
  onDownloadRealPdf, downloadingRealPdf,
}: Props) {
  const s = state.store;
  const upd = (patch: Partial<typeof state.store>) => set({ store: { ...state.store, ...patch } });

  return (
    <aside
      className="w-[440px] shrink-0 h-full overflow-y-auto bg-white border-r border-slate-200 p-6 custom-scrollbar"
      style={{ boxShadow: '4px 0 24px rgba(15,23,42,0.03)' }}
    >
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.14em] text-[#3B5BDB] font-semibold mb-1">Design studio</div>
        <h2 className="font-heading text-2xl font-semibold text-slate-900">Receipt template</h2>
        <p className="text-sm text-slate-500 mt-1">Customize how every order receipt will look.</p>
      </div>

      <div className="space-y-3">
        <Section icon={ClipboardList} title="Preview with a real order" defaultOpen>
          <p className="text-xs text-slate-500 mb-3">
            Pick one of your real orders to see (and download) the actual receipt that order will get —
            items, GST and totals fill in automatically. Leave unselected to keep designing with sample data.
            Delivered or cancelled orders drop off this list once they're done.
          </p>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value ? Number(e.target.value) : '')}
            className={inputCls}
          >
            <option value="">Select order number</option>
            {orders.filter((o) => o.status !== 4 && o.status !== 5).map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber}
              </option>
            ))}
          </select>
          {selectedOrderId && (
            <button
              onClick={onDownloadRealPdf}
              disabled={downloadingRealPdf}
              className="mt-3 w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Download size={14} /> {downloadingRealPdf ? 'Generating…' : 'Download real PDF receipt'}
            </button>
          )}
          <p className="text-[11px] text-slate-400 mt-2">
            This uses your saved template to generate the actual server-side receipt PDF for this order —
            higher quality than the &quot;Download PDF&quot; button in the preview panel, which just exports what&apos;s on screen.
          </p>
        </Section>

        <Section icon={LayoutTemplate} title="Template">
          <TemplatePicker value={state.templateId} onChange={(id) => set({ templateId: id })} />
        </Section>

        <Section icon={Store} title="Store details">
          <div className="space-y-4">
            <LogoUploader
              value={s.logoUrl}
              apiBase={apiBase}
              uploading={logoUploading}
              onUpload={onUploadLogo}
              onRemove={onRemoveLogo}
              onError={onError}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Store name"><input className={inputCls} value={s.name} onChange={(e) => upd({ name: e.target.value })} /></Field>
              <Field label="Phone"><input className={inputCls} value={s.phone} onChange={(e) => upd({ phone: e.target.value })} /></Field>
              <Field label="Email"><input className={inputCls} value={s.email} onChange={(e) => upd({ email: e.target.value })} /></Field>
              <Field label="Website"><input className={inputCls} value={s.website} onChange={(e) => upd({ website: e.target.value })} /></Field>
              <div className="col-span-2"><Field label="Address"><input className={inputCls} value={s.address} onChange={(e) => upd({ address: e.target.value })} /></Field></div>
              <div className="col-span-2"><Field label="GSTIN"><input className={inputCls} value={s.gst} onChange={(e) => upd({ gst: e.target.value })} /></Field></div>
            </div>
          </div>
        </Section>

        <Section icon={Palette} title="Style & branding">
          <div className="space-y-4">
            <Field label="Primary color"><ColorPicker value={state.style.primary} onChange={(v) => set({ style: { ...state.style, primary: v } })} /></Field>
            <Field label="Accent background"><ColorPicker value={state.style.secondary} onChange={(v) => set({ style: { ...state.style, secondary: v } })} /></Field>
            <Field label="Font family">
              <select value={state.style.fontId} onChange={(e) => set({ style: { ...state.style, fontId: e.target.value } })} className={inputCls}>
                {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section icon={Receipt} title="Bill fields">
          <DynamicFields items={state.billFields} onChange={(v) => set({ billFields: v })} addPlaceholder="e.g. Cashier, Branch, Website" />
        </Section>

        <Section icon={Users} title="Customer fields">
          <DynamicFields items={state.customerFields} onChange={(v) => set({ customerFields: v })} addPlaceholder="e.g. Address, Company, PAN" />
        </Section>

        <Section icon={Package} title="Items & totals">
          <div className="space-y-4">
            {selectedOrderId ? (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3">
                Showing real items from order <strong>#{selectedOrderId}</strong> — quantities, rates and totals come
                straight from the order and can&apos;t be edited here. Deselect the order above to go back to sample items.
              </p>
            ) : (
              <ItemsEditor items={state.items} onChange={(v) => set({ items: v })} />
            )}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <Field label="Discount % (sample only)">
                <input type="number" className={inputCls} value={state.totals.discountPct}
                  onChange={(e) => set({ totals: { ...state.totals, discountPct: Number(e.target.value) || 0 } })} />
              </Field>
              <Field label="CGST %">
                <input type="number" className={inputCls} value={state.totals.cgstPct}
                  onChange={(e) => set({ totals: { ...state.totals, cgstPct: Number(e.target.value) || 0 } })} />
              </Field>
              <Field label="SGST %">
                <input type="number" className={inputCls} value={state.totals.sgstPct}
                  onChange={(e) => set({ totals: { ...state.totals, sgstPct: Number(e.target.value) || 0 } })} />
              </Field>
              <Field label="IGST %">
                <input type="number" className={inputCls} value={state.totals.igstPct}
                  onChange={(e) => set({ totals: { ...state.totals, igstPct: Number(e.target.value) || 0 } })} />
              </Field>
            </div>
            <p className="text-[11px] text-slate-400">
              For a real order, CGST/SGST/IGST only control how the order&apos;s actual tax amount is split on paper —
              the total charged never changes.
            </p>
          </div>
        </Section>

        <Section icon={QrCode} title="QR, barcode & footer">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">Show QR code</div>
                <div className="text-xs text-slate-500">Same link/QR shown on every receipt</div>
              </div>
              <Toggle checked={state.extras.showQr} onChange={(v) => set({ extras: { ...state.extras, showQr: v } })} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div>
                <div className="text-sm font-medium text-emerald-900">Use UPI payment QR</div>
                <div className="text-xs text-emerald-700">Auto-fills the real amount &amp; order number — scan to pay directly</div>
              </div>
              <Toggle checked={state.extras.useUpiQr} onChange={(v) => set({ extras: { ...state.extras, useUpiQr: v } })} />
            </div>

            {state.extras.useUpiQr ? (
              <Field label="Your UPI ID">
                <input className={inputCls} value={state.extras.upiId} onChange={(e) => set({ extras: { ...state.extras, upiId: e.target.value } })} placeholder="storename@okhdfcbank" />
              </Field>
            ) : (
              <Field label="QR value / payment URL">
                <input className={inputCls} value={state.extras.qrValue} onChange={(e) => set({ extras: { ...state.extras, qrValue: e.target.value } })} placeholder="https://yourstore.com" />
              </Field>
            )}

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">Show barcode</div>
                <div className="text-xs text-slate-500">Always encodes the real order number</div>
              </div>
              <Toggle checked={state.extras.showBarcode} onChange={(v) => set({ extras: { ...state.extras, showBarcode: v } })} />
            </div>
            <Field label="Footer note">
              <input className={inputCls} value={state.extras.footerNote} onChange={(e) => set({ extras: { ...state.extras, footerNote: e.target.value } })} />
            </Field>
          </div>
        </Section>

        <Section icon={PenLine} title="Signature">
          <div className="space-y-3">
            <Field label="Typed signature">
              <input className={inputCls} value={state.extras.signatureText} onChange={(e) => set({ extras: { ...state.extras, signatureText: e.target.value } })} placeholder="Type your name" />
            </Field>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-200" /> or upload <span className="h-px flex-1 bg-slate-200" />
            </div>
            <LogoUploader
              value={state.extras.signatureImageUrl}
              apiBase={apiBase}
              uploading={signatureUploading}
              onUpload={onUploadSignature}
              onRemove={onRemoveSignature}
              onError={onError}
              label="Drag & drop a signature image"
            />
          </div>
        </Section>
      </div>
    </aside>
  );
}
