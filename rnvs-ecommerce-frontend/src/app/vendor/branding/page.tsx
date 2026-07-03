'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Eye, Palette, Type } from 'lucide-react';
import { brandingApi } from '@/lib/api';

const FONTS = ['Arial', 'Georgia', 'Helvetica', 'Inter', 'Lato', 'Montserrat', 'Open Sans', 'Poppins', 'Roboto', 'Times New Roman'];

interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

const DEFAULT: BrandingSettings = {
  primaryColor: '#1e40af',
  secondaryColor: '#ffffff',
  fontFamily: 'Arial',
};

export default function ReceiptStylePage() {
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULT);
  const [saved, setSaved] = useState<BrandingSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    brandingApi.get()
      .then((r) => {
        const d = r.data?.data || r.data;
        if (d) {
          const s: BrandingSettings = {
            primaryColor: d.primaryColor || DEFAULT.primaryColor,
            secondaryColor: d.secondaryColor || DEFAULT.secondaryColor,
            fontFamily: d.fontFamily || DEFAULT.fontFamily,
          };
          setSettings(s);
          setSaved(s);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof BrandingSettings, v: string) =>
    setSettings((p) => ({ ...p, [k]: v }));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await brandingApi.update({
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        fontFamily: settings.fontFamily,
      });
      setSaved(settings);
      showToast('Receipt style saved!');
    } catch {
      showToast('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900">Receipt Style</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize how your customer receipts and invoices look</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <Save size={15} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mb-4 px-4 py-2.5 bg-slate-800 text-white text-sm rounded-xl inline-flex">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — controls */}
        <div className="space-y-5">

          {/* Colors */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={16} className="text-slate-500" />
              <h2 className="font-bold text-sm text-slate-900">Colors</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">
                  Primary color
                  <span className="font-normal text-gray-400 ml-1">— header background, accent text</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => set('primaryColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => set('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">
                  Background color
                  <span className="font-normal text-gray-400 ml-1">— receipt body background</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => set('secondaryColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => set('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Font */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Type size={16} className="text-slate-500" />
              <h2 className="font-bold text-sm text-slate-900">Typography</h2>
            </div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">Font family</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => set('fontFamily', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
              style={{ fontFamily: settings.fontFamily }}
            >
              {FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-2">This font applies to all text on your customer receipts.</p>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 mb-1">What this affects</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              These styles are applied to PDF receipts and email invoices sent to your customers after each order. Your store name and contact info are pulled from your Company Profile.
            </p>
          </div>
        </div>

        {/* RIGHT — receipt preview */}
        <div className="sticky top-6 self-start">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={16} className="text-slate-500" />
              <h2 className="font-bold text-sm text-slate-900">Preview</h2>
            </div>

            <div
              className="rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              style={{ fontFamily: settings.fontFamily, backgroundColor: settings.secondaryColor }}
            >
              {/* Receipt header */}
              <div className="px-5 py-4 text-center" style={{ backgroundColor: settings.primaryColor }}>
                <p className="font-bold text-white text-base">Your Store Name</p>
                <p className="text-white/70 text-xs mt-0.5">store@example.com · +91 98765 43210</p>
              </div>

              {/* Receipt body */}
              <div className="px-5 py-4">
                <div className="flex justify-between text-xs text-gray-500 mb-3">
                  <span>Receipt #INV-00123</span>
                  <span>10 Apr 2026</span>
                </div>

                <div className="border-t border-b border-gray-100 py-3 space-y-2">
                  {[
                    { name: 'Product A', qty: 2, price: 799 },
                    { name: 'Product B', qty: 1, price: 1499 },
                  ].map((item) => (
                    <div key={item.name} className="flex justify-between text-xs">
                      <span className="text-gray-700">{item.name} × {item.qty}</span>
                      <span className="font-semibold text-slate-800">₹{(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span>₹3,097</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>GST (18%)</span><span>₹557</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-gray-100 mt-1">
                    <span>Total</span>
                    <span style={{ color: settings.primaryColor }}>₹3,654</span>
                  </div>
                </div>

                <p className="mt-4 text-center text-[10px] text-gray-400">
                  Thank you for shopping with us!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
