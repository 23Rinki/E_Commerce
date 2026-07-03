'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Save, RefreshCw, X, CheckCircle2, Plus, GripVertical } from 'lucide-react';
import { brandingApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';

interface BillField {
  id: string;
  label: string;
  value: string;
}

interface ReceiptSetup {
  logoUrl: string | null;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  website: string;
  gstNumber: string;
  billFields: BillField[];
  customerFields: BillField[];
}

const DEFAULT: ReceiptSetup = {
  logoUrl: null,
  storeName: '',
  storeAddress: '',
  storePhone: '',
  storeEmail: '',
  website: '',
  gstNumber: '',
  billFields: [
    { id: 'date',    label: 'Date',      value: '' },
    { id: 'receipt', label: 'Receipt #', value: '' },
  ],
  customerFields: [
    { id: 'cust_name',  label: 'Name',  value: '' },
    { id: 'cust_email', label: 'Email', value: '' },
    { id: 'cust_phone', label: 'Phone', value: '' },
  ],
};

const inp = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors';

export default function ReceiptsPage() {
  const { designation } = useVendorStore();
  useVendorAccess('receipts', designation);

  const [setup, setSetup] = useState<ReceiptSetup>(DEFAULT);
  const [saved, setSaved] = useState<ReceiptSetup>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [newBillField, setNewBillField] = useState('');
  const [newCustomerField, setNewCustomerField] = useState('');
  const [errors, setErrors] = useState<{ address?: string; phone?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);
  const [customReceiptImageUrl, setCustomReceiptImageUrl] = useState<string | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [removingTemplate, setRemovingTemplate] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7147';

  useEffect(() => {
    brandingApi.get()
      .then((r) => {
        const d = r.data?.data || r.data;
        if (d) {
          const loaded: ReceiptSetup = {
            logoUrl: d.logoUrl || null,
            storeName: d.storeName || '',
            storeAddress: d.storeAddress || '',
            storePhone: d.storePhone || '',
            storeEmail: d.storeEmail || '',
            website: d.website || '',
            gstNumber: d.gstNumber || '',
            billFields: d.billFieldsJson
              ? JSON.parse(d.billFieldsJson)
              : DEFAULT.billFields,
            customerFields: d.customerFieldsJson
              ? JSON.parse(d.customerFieldsJson)
              : DEFAULT.customerFields,
          };
          setSetup(loaded);
          setSaved(loaded);
          setCustomReceiptImageUrl(d.customReceiptImageUrl || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof ReceiptSetup, v: string) =>
    setSetup((p) => ({ ...p, [k]: v }));

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 6000);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await brandingApi.uploadLogo(fd);
      const url = r.data?.data?.logoUrl || r.data?.logoUrl;
      if (url) {
        setSetup((p) => ({ ...p, logoUrl: url }));
        showToast('Logo uploaded successfully');
      }
    } catch {
      showToast('Upload failed. Try again.', false);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleTemplateUpload = async (file: File) => {
    setUploadingTemplate(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await brandingApi.uploadReceiptTemplate(fd);
      const url = r.data?.data?.customReceiptImageUrl || r.data?.customReceiptImageUrl;
      if (url) {
        setCustomReceiptImageUrl(url);
        showToast('Uploaded Receipt is saved');
      }
    } catch {
      showToast('Template upload failed. Try again.', false);
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleRemoveTemplate = async () => {
    setRemovingTemplate(true);
    try {
      await brandingApi.removeReceiptTemplate();
      setCustomReceiptImageUrl(null);
      showToast('Custom receipt template removed');
    } catch {
      showToast('Could not remove template. Try again.', false);
    } finally {
      setRemovingTemplate(false);
    }
  };

  const handleSave = async () => {
    const errs: { address?: string; phone?: string } = {};
    if (!setup.storeAddress.trim()) errs.address = 'Store address is required';
    if (!setup.storePhone.trim())   errs.phone   = 'Store phone is required';
    if (Object.keys(errs).length) {
      setErrors(errs);
      showToast('Fields marked with * are required. Please fill them before saving.', false);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await brandingApi.update({
        logoUrl:           setup.logoUrl,
        storeName:         setup.storeName,
        storeAddress:      setup.storeAddress,
        storePhone:        setup.storePhone,
        storeEmail:        setup.storeEmail,
        website:           setup.website,
        gstNumber:         setup.gstNumber,
        billFieldsJson:    JSON.stringify(setup.billFields),
        customerFieldsJson: JSON.stringify(setup.customerFields),
      });
      setSaved(setup);
      showToast('Receipt setup saved!');
    } catch (err: unknown) {
      const serverMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(serverMsg || 'Could not connect to server. Check your internet and try again.', false);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(setup) !== JSON.stringify(saved);
  const logoSrc = setup.logoUrl
    ? (setup.logoUrl.startsWith('http') ? setup.logoUrl : `${apiBase}${setup.logoUrl}`)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-black text-slate-900">Store Receipt</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Set up your store details and logo. This will appear on every receipt delivered with your orders.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <p className="text-[11px] text-gray-400">Saves store details, logo &amp; fields</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mt-4 mb-2 px-5 py-3 text-base font-semibold rounded-xl inline-flex items-center gap-2
          ${toast.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle2 size={14} /> : <X size={14} />}
          {toast.msg}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — inputs */}
        <div className="space-y-5">

          {/* Logo upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-slate-900 mb-1">Store Logo</p>
            <p className="text-xs text-gray-400 mb-4">Appears at the top of every receipt sent to your customers.</p>

            <div
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-slate-50'}`}
            >
              {logoSrc ? (
                <img src={logoSrc} alt="Store logo" className="mx-auto max-h-16 object-contain mb-3" />
              ) : (
                <Upload size={26} className="mx-auto text-gray-300 mb-2" />
              )}
              <p className="text-xs font-medium text-slate-600">
                {uploading ? 'Uploading...' : logoSrc ? 'Click to replace logo' : 'Click or drag & drop your logo'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">PNG, JPG, SVG · Max 2 MB</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
            />

            {logoSrc && (
              <button
                onClick={() => setSetup((p) => ({ ...p, logoUrl: null }))}
                className="mt-3 text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <X size={12} /> Remove logo
              </button>
            )}
          </div>

          {/* Custom Receipt Template */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-1">
              <p className="text-sm font-bold text-slate-900">Custom Receipt Template</p>
              <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">Auto-saved on upload</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Upload your own pre-designed receipt image (JPG, PNG, PDF — max 5 MB). It will appear as page 1 of the PDF sent to customers. The system-generated order summary is automatically added on page 2.
            </p>

            {customReceiptImageUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {customReceiptImageUrl.endsWith('.pdf') ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs flex-shrink-0">PDF</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">receipt-template.pdf</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Uploaded template</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={`${apiBase}${customReceiptImageUrl}`}
                      alt="Custom receipt template"
                      className="w-full max-h-64 object-contain bg-gray-50 p-3"
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => templateFileRef.current?.click()}
                    disabled={uploadingTemplate}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Upload size={13} />
                    {uploadingTemplate ? 'Uploading...' : 'Replace'}
                  </button>
                  <button
                    onClick={handleRemoveTemplate}
                    disabled={removingTemplate}
                    className="flex items-center gap-1.5 px-3 py-2 border border-red-200 hover:bg-red-50 disabled:opacity-50 text-red-500 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <X size={13} />
                    {removingTemplate ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => templateFileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload size={26} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">
                  {uploadingTemplate ? 'Uploading...' : 'Click to upload your receipt design'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, PDF · Max 5 MB</p>
              </div>
            )}

            <input
              ref={templateFileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTemplateUpload(f); e.target.value = ''; }}
            />
          </div>

          {/* Store details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-slate-900 mb-4">Store Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Store name</label>
                <input type="text" value={setup.storeName} onChange={(e) => set('storeName', e.target.value)}
                  className={inp} placeholder="e.g. Tech Gadgets India" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={setup.storeAddress}
                  onChange={(e) => { set('storeAddress', e.target.value); setErrors((p) => ({ ...p, address: undefined })); }}
                  className={`${inp} resize-none ${errors.address ? 'border-red-400' : ''}`}
                  rows={2} placeholder="Shop No. 5, MG Road, Mumbai 400001"
                />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={setup.storePhone}
                    onChange={(e) => { set('storePhone', e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }}
                    className={`${inp} ${errors.phone ? 'border-red-400' : ''}`}
                    placeholder="+91 98765 43210"
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email</label>
                  <input type="text" value={setup.storeEmail} onChange={(e) => set('storeEmail', e.target.value)}
                    className={inp} placeholder="store@example.com" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Website <span className="font-normal text-gray-400">(optional)</span></label>
                <input type="text" value={setup.website} onChange={(e) => set('website', e.target.value)}
                  className={inp} placeholder="www.yourstore.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  GST Number <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input type="text" value={setup.gstNumber} onChange={(e) => set('gstNumber', e.target.value)}
                  className={inp} placeholder="27AAPFU0939F1ZV" />
              </div>
            </div>
          </div>
          {/* Bill Fields */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-slate-900 mb-1">Bill Fields</p>
            <p className="text-xs text-gray-400 mb-4">
              Order-level details on every receipt. Values filled automatically from the order.
            </p>
            <div className="space-y-2 mb-3">
              {setup.billFields.map((field) => (
                <div key={field.id} className="flex items-center gap-2">
                  <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                  <span className="w-24 flex-shrink-0 text-xs font-semibold text-slate-600 px-2 py-2 bg-gray-50 rounded-lg border border-gray-100 truncate">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) =>
                      setSetup((p) => ({
                        ...p,
                        billFields: p.billFields.map((f) =>
                          f.id === field.id ? { ...f, value: e.target.value } : f
                        ),
                      }))
                    }
                    className={`${inp} flex-1 text-xs`}
                    placeholder={`Value for ${field.label} (leave blank = filled from order)`}
                  />
                  <button
                    onClick={() =>
                      setSetup((p) => ({
                        ...p,
                        billFields: p.billFields.filter((f) => f.id !== field.id),
                      }))
                    }
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBillField}
                onChange={(e) => setNewBillField(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBillField.trim()) {
                    setSetup((p) => ({ ...p, billFields: [...p.billFields, { id: `bill_${Date.now()}`, label: newBillField.trim(), value: '' }] }));
                    setNewBillField('');
                  }
                }}
                className={`${inp} flex-1`}
                placeholder="e.g. Cashier, Branch, Website"
              />
              <button
                onClick={() => {
                  if (!newBillField.trim()) return;
                  setSetup((p) => ({ ...p, billFields: [...p.billFields, { id: `bill_${Date.now()}`, label: newBillField.trim(), value: '' }] }));
                  setNewBillField('');
                }}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-slate-900 mb-1">Customer Details</p>
            <p className="text-xs text-gray-400 mb-4">
              Buyer information printed on the receipt. Values filled from the customer's order.
            </p>
            <div className="space-y-2 mb-3">
              {setup.customerFields.map((field) => (
                <div key={field.id} className="flex items-center gap-2">
                  <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                  <span className="flex-1 text-sm text-slate-700 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                    {field.label}
                  </span>
                  <button
                    onClick={() =>
                      setSetup((p) => ({
                        ...p,
                        customerFields: p.customerFields.filter((f) => f.id !== field.id),
                      }))
                    }
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCustomerField}
                onChange={(e) => setNewCustomerField(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCustomerField.trim()) {
                    setSetup((p) => ({ ...p, customerFields: [...p.customerFields, { id: `cust_${Date.now()}`, label: newCustomerField.trim() }] }));
                    setNewCustomerField('');
                  }
                }}
                className={`${inp} flex-1`}
                placeholder="e.g. Address, Company, PAN"
              />
              <button
                onClick={() => {
                  if (!newCustomerField.trim()) return;
                  setSetup((p) => ({ ...p, customerFields: [...p.customerFields, { id: `cust_${Date.now()}`, label: newCustomerField.trim() }] }));
                  setNewCustomerField('');
                }}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — receipt preview */}
        <div className="sticky top-6 self-start">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-900">Receipt Preview</p>
              {customReceiptImageUrl && (
                <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">Custom template active</span>
              )}
            </div>

            {/* When vendor has uploaded their own design, show it */}
            {customReceiptImageUrl && !customReceiptImageUrl.endsWith('.pdf') ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <img
                    src={`${apiBase}${customReceiptImageUrl}`}
                    alt="Your receipt design"
                    className="w-full object-contain bg-gray-50"
                  />
                </div>
                <p className="text-sm font-semibold text-green-600 text-center">
                  Uploaded Receipt is saved
                </p>
                <p className="text-sm text-gray-500 text-center">
                  This is what your customers will receive. Order items and totals are attached automatically.
                </p>
              </div>
            ) : customReceiptImageUrl?.endsWith('.pdf') ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm mx-auto mb-3">PDF</div>
                  <p className="text-xs font-semibold text-slate-700">Your custom receipt design</p>
                </div>
                <p className="text-sm font-semibold text-green-600 text-center">
                  Uploaded Receipt is saved
                </p>
                <p className="text-sm text-gray-500 text-center">
                  This is what your customers will receive. Order items and totals are attached automatically.
                </p>
              </div>
            ) : (

            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm text-xs bg-white">

              {/* Row 1: Logo LEFT + RECEIPT center */}
              <div className="px-5 pt-4 pb-3 flex items-center gap-4">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {logoSrc ? (
                    <img src={logoSrc} alt="Logo" className="max-h-24 max-w-[130px] object-contain" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Upload size={28} className="text-gray-400" />
                    </div>
                  )}
                  {setup.storeName && (
                    <p className="font-black text-slate-900 text-[11px] tracking-wide uppercase mt-1">
                      {setup.storeName}
                    </p>
                  )}
                </div>
                {/* RECEIPT in center */}
                <div className="flex-1 text-center">
                  <p className="text-[15px] font-black tracking-widest text-slate-900 uppercase">Receipt</p>
                </div>
              </div>

              {/* Line 1 */}
              <div className="mx-5 h-px bg-gray-800" />

              {/* Two columns: store contact LEFT | customer + bill fields RIGHT */}
              <div className="px-5 py-3 flex gap-4">

                {/* LEFT: store address, phone, email, website, GST */}
                <div className="flex-1 space-y-1 text-[11px] text-slate-700">
                  {setup.storeAddress && <p className="leading-snug">{setup.storeAddress}</p>}
                  {setup.storePhone   && <p>{setup.storePhone}</p>}
                  {setup.storeEmail   && <p>{setup.storeEmail}</p>}
                  {setup.website      && <p>{setup.website}</p>}
                  {setup.gstNumber    && <p className="text-slate-500">GST: {setup.gstNumber}</p>}
                  {!setup.storeAddress && !setup.storePhone && !setup.storeEmail && !setup.website && (
                    <p className="text-gray-300 italic">Address / Phone / Email / Website</p>
                  )}
                </div>

                {/* RIGHT: customer fields + bill fields */}
                <div className="flex-1 space-y-1 text-[11px] text-right">
                  {setup.customerFields.map((field) => (
                    <div key={field.id} className="flex justify-end items-center gap-2">
                      <span className="text-slate-700 font-medium">{field.label || '—'}:</span>
                      {field.value
                        ? <span className="text-slate-800">{field.value}</span>
                        : <div className="h-2 bg-gray-200 rounded w-20" />
                      }
                    </div>
                  ))}
                  {setup.billFields.map((field) => (
                    <div key={field.id} className="flex justify-end items-center gap-2">
                      <span className="text-slate-700 font-medium">{field.label || '—'}:</span>
                      {field.value
                        ? <span className="text-slate-800">{field.value}</span>
                        : <div className="h-2 bg-gray-200 rounded w-20" />
                      }
                    </div>
                  ))}
                </div>

              </div>

              {/* Line 2 */}
              <div className="mx-5 h-px bg-gray-800" />

              {/* Items table */}
              <div className="px-5 pt-3 pb-2">
                <div className="grid grid-cols-12 text-[10px] font-bold text-slate-800 uppercase tracking-wider border-b border-gray-300 pb-1.5 mb-2">
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-3 text-right">Total</span>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-12 py-1.5 border-b border-gray-100">
                    <div className="col-span-5 h-2 bg-gray-200 rounded w-3/4" />
                    <div className="col-span-2 flex justify-center"><div className="h-2 bg-gray-200 rounded w-4" /></div>
                    <div className="col-span-2 flex justify-end"><div className="h-2 bg-gray-200 rounded w-8" /></div>
                    <div className="col-span-3 flex justify-end"><div className="h-2 bg-gray-200 rounded w-10" /></div>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 italic text-center mt-2 mb-1">
                  Order items will appear here
                </p>
              </div>

              {/* Totals */}
              <div className="px-5 py-3 space-y-1.5 border-t border-gray-200">
                {['Subtotal', 'Tax'].map((label) => (
                  <div key={label} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-700">{label}</span>
                    <div className="h-2 bg-gray-200 rounded w-14" />
                  </div>
                ))}
                <div className="flex justify-between items-center text-[12px] font-black text-slate-900 border-t border-gray-300 pt-1.5">
                  <span>Total</span>
                  <div className="h-2.5 bg-gray-300 rounded w-16" />
                </div>
              </div>

              {/* Thank you */}
              <div className="text-center py-3 border-t border-gray-200">
                <p className="text-[13px] font-black text-slate-800 italic">Thank you!</p>
              </div>

            </div>
            )} {/* end no-custom-template branch */}
          </div>
        </div>
      </div>
    </div>
  );
}
