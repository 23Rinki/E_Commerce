'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Save, Sparkles, CheckCircle2, X } from 'lucide-react';
import { brandingApi, vendorOrdersApi, vendorProfileApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import EditorSidebar from '@/components/receipt/EditorSidebar';
import LivePreview from '@/components/receipt/LivePreview';
import { DEFAULT_STATE, DEFAULT_BILL_FIELDS, DEFAULT_CUSTOMER_FIELDS, SAMPLE_ITEMS } from '@/lib/receipt/defaults';
import { resolveReceiptData } from '@/lib/receipt/resolve';
import type { ReceiptState, VendorOrder } from '@/lib/receipt/types';

export default function ReceiptsPage() {
  const { designation } = useVendorStore();
  useVendorAccess('receipts', designation);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7147';

  const [state, setState] = useState<ReceiptState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');

  const [logoUploading, setLogoUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [downloadingRealPdf, setDownloadingRealPdf] = useState(false);

  const skipNextAutosave = useRef(true); // don't autosave the initial load
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 5000);
  };

  const set = (patch: Partial<ReceiptState>) => setState((p) => ({ ...p, ...patch }));

  useEffect(() => {
    brandingApi.get()
      .then((r) => {
        const d = r.data?.data || r.data;
        if (d) {
          skipNextAutosave.current = true;
          setState({
            templateId: (d.templateStyle || 'classic') as ReceiptState['templateId'],
            style: {
              primary: d.primaryColor || DEFAULT_STATE.style.primary,
              secondary: d.secondaryColor || DEFAULT_STATE.style.secondary,
              fontId: d.fontFamily || DEFAULT_STATE.style.fontId,
            },
            store: {
              name: d.storeName || '',
              address: d.storeAddress || '',
              phone: d.storePhone || '',
              email: d.storeEmail || '',
              website: d.website || '',
              gst: d.gstNumber || '',
              logoUrl: d.logoUrl || '',
            },
            billFields: d.billFieldsJson ? JSON.parse(d.billFieldsJson) : DEFAULT_BILL_FIELDS,
            customerFields: d.customerFieldsJson ? JSON.parse(d.customerFieldsJson) : DEFAULT_CUSTOMER_FIELDS,
            items: SAMPLE_ITEMS,
            totals: {
              discountPct: 0,
              cgstPct: d.cgstPercent ?? 50,
              sgstPct: d.sgstPercent ?? 50,
              igstPct: d.igstPercent ?? 0,
            },
            extras: {
              showQr: d.showQrCode ?? true,
              qrValue: d.qrValue || '',
              useUpiQr: d.useUpiQr ?? false,
              upiId: d.upiId || '',
              showBarcode: d.showBarcode ?? true,
              signatureText: d.signatureText || '',
              signatureImageUrl: d.signatureImageUrl || '',
              footerNote: d.footerNote || 'Thank you for shopping with us!',
            },
          });
          // Backfill any still-blank store fields from the vendor's actual registered profile,
          // so a first-time visit shows real details instead of empty inputs / "Your Store Name".
          const needsBackfill = !d.storeName || !d.storePhone || !d.storeEmail || !d.gstNumber;
          if (needsBackfill) {
            vendorProfileApi.get()
              .then((pr) => {
                const p = pr.data?.data || pr.data;
                if (!p) return;
                skipNextAutosave.current = true;
                setState((prev) => ({
                  ...prev,
                  store: {
                    ...prev.store,
                    name: prev.store.name || p.storeName || '',
                    email: prev.store.email || p.email || '',
                    phone: prev.store.phone || p.phoneNumber || '',
                    gst: prev.store.gst || p.gstNumber || '',
                  },
                }));
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => showToast('Could not load receipt settings.', false))
      .finally(() => setLoading(false));

    vendorOrdersApi.getAll()
      .then((r) => {
        const data: VendorOrder[] = (r.data?.data ?? r.data ?? []).map((o: VendorOrder) => ({
          ...o,
          items: o.items ?? [],
        }));
        setOrders(data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (s: ReceiptState) => {
    setSaving(true);
    try {
      await brandingApi.update({
        primaryColor: s.style.primary,
        secondaryColor: s.style.secondary,
        fontFamily: s.style.fontId,
        storeName: s.store.name,
        storeAddress: s.store.address,
        storePhone: s.store.phone,
        storeEmail: s.store.email,
        website: s.store.website,
        gstNumber: s.store.gst,
        billFieldsJson: JSON.stringify(s.billFields),
        customerFieldsJson: JSON.stringify(s.customerFields),
        templateStyle: s.templateId,
        showQrCode: s.extras.showQr,
        qrValue: s.extras.qrValue,
        useUpiQr: s.extras.useUpiQr,
        upiId: s.extras.upiId,
        showBarcode: s.extras.showBarcode,
        footerNote: s.extras.footerNote,
        signatureText: s.extras.signatureText,
        signatureImageUrl: s.extras.signatureImageUrl,
        cgstPercent: s.totals.cgstPct,
        sgstPercent: s.totals.sgstPct,
        igstPercent: s.totals.igstPct,
      });
      setSavedAt('just now');
    } catch {
      showToast('Could not save. Check your internet and try again.', false);
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounced autosave whenever the template config changes
  useEffect(() => {
    if (loading) return;
    if (skipNextAutosave.current) { skipNextAutosave.current = false; return; }
    if (savingTimer.current) clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => persist(state), 900);
    return () => { if (savingTimer.current) clearTimeout(savingTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, loading]);

  const handleSaveNow = () => persist(state).then(() => showToast('Receipt template saved'));

  const handleUploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await brandingApi.uploadLogo(fd);
      const url = r.data?.data?.logoUrl || r.data?.logoUrl;
      if (url) { set({ store: { ...state.store, logoUrl: url } }); showToast('Logo uploaded'); }
    } catch {
      showToast('Logo upload failed.', false);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleUploadSignature = async (file: File) => {
    setSignatureUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await brandingApi.uploadSignature(fd);
      const url = r.data?.data?.signatureImageUrl || r.data?.signatureImageUrl;
      if (url) { set({ extras: { ...state.extras, signatureImageUrl: url } }); showToast('Signature uploaded'); }
    } catch {
      showToast('Signature upload failed.', false);
    } finally {
      setSignatureUploading(false);
    }
  };

  const handleDownloadRealPdf = async () => {
    if (!selectedOrderId) return;
    setDownloadingRealPdf(true);
    try {
      const res = await brandingApi.downloadReceiptPdf(Number(selectedOrderId));
      const order = orders.find((o) => o.id === selectedOrderId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt-${order?.orderNumber ?? selectedOrderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to download receipt PDF. Please try again.', false);
    } finally {
      setDownloadingRealPdf(false);
    }
  };

  const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) || null : null;
  const resolvedData = resolveReceiptData(state, selectedOrder);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <Sparkles className="animate-pulse text-slate-300" size={28} />
      </div>
    );
  }

  return (
    <div className="receipt-designer h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-[#F8FAFC] font-body">
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 z-20 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3B5BDB] to-[#5C7CFA] flex items-center justify-center text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="font-heading text-[15px] font-semibold text-slate-900 leading-tight">Store Receipt Designer</div>
            <div className="text-[11px] text-slate-500 leading-tight">Vendor · {state.store.name || 'Your store'}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${saving ? 'pulse-dot' : ''}`} />
            {saving ? 'Saving…' : savedAt ? `Auto-saved ${savedAt}` : 'All changes saved'}
          </div>
          <button
            onClick={handleSaveNow}
            disabled={saving}
            className="h-9 px-5 rounded-full bg-[#3B5BDB] hover:bg-[#304AC0] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Save size={14} /> Save template
          </button>
        </div>
      </header>

      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium flex items-center gap-2
          ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle2 size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <EditorSidebar
          state={state}
          set={set}
          apiBase={apiBase}
          orders={orders}
          selectedOrderId={selectedOrderId}
          setSelectedOrderId={setSelectedOrderId}
          logoUploading={logoUploading}
          onUploadLogo={handleUploadLogo}
          onRemoveLogo={() => set({ store: { ...state.store, logoUrl: '' } })}
          signatureUploading={signatureUploading}
          onUploadSignature={handleUploadSignature}
          onRemoveSignature={() => set({ extras: { ...state.extras, signatureImageUrl: '' } })}
          onError={(msg) => showToast(msg, false)}
          onDownloadRealPdf={handleDownloadRealPdf}
          downloadingRealPdf={downloadingRealPdf}
        />
        <LivePreview state={state} data={resolvedData} apiBase={apiBase} onError={(msg) => showToast(msg, false)} />
      </main>
    </div>
  );
}
