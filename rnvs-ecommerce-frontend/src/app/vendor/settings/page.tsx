'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Store, DollarSign, Globe, ShoppingBag, MessageSquare, ExternalLink, CheckCircle2, AlertTriangle, X, Settings as SettingsIcon } from 'lucide-react';
import { vendorSettingsApi } from '@/lib/api';

interface Setting {
  key: string;
  value: string;
  description?: string;
  category: string;
  dataType: number; // 0=String, 1=Integer, 2=Decimal, 3=Boolean, 4=Json
}

type SettingsMap = Record<string, string>;

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
];

const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney',
];

const DEFAULTS: SettingsMap = {
  StoreName: '', StoreEmail: '', StorePhone: '', TaxRate: '0.18', Currency: 'INR',
  CurrencySymbol: '₹', TimeZone: 'Asia/Kolkata', EnableReviews: 'true', MinOrderAmount: '0',
};

const inputCls = 'w-full rounded-lg border border-[#3B5BDB]/15 bg-[#F8FAFC] focus:bg-white focus:border-[#3B5BDB] focus:ring-2 focus:ring-[#3B5BDB]/20 outline-none px-3 py-2.5 text-sm text-[#0A1128] transition-colors';

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ size?: number }>; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6 md:p-7 space-y-4">
      <header className="flex items-center gap-2.5">
        <span className="h-8 w-8 rounded-lg bg-[#E6F0FA] text-[#3B5BDB] flex items-center justify-center"><Icon size={16} /></span>
        <h2 className="text-base font-semibold text-[#0A1128]">{title}</h2>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[#3B5BDB]' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function VendorSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>(DEFAULTS);
  const [saved, setSaved] = useState<SettingsMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);

  useEffect(() => {
    vendorSettingsApi.initialize()
      .catch(() => {})
      .finally(() => {
        vendorSettingsApi.getAll()
          .then((r) => {
            const rows: Setting[] = r.data?.data || r.data || [];
            const map: SettingsMap = { ...DEFAULTS };
            rows.forEach((s) => { map[s.key] = s.value; });
            setSettings(map);
            setSaved(map);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, []);

  const set = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: string) => set(key, settings[key] === 'true' ? 'false' : 'true');

  const showToast = (msg: string, error = false) => {
    setToast(msg);
    setToastError(error);
    if (!error) setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Object.entries(settings).filter(([k, v]) => v !== saved[k]);
      const results = await Promise.allSettled(changed.map(([k, v]) => vendorSettingsApi.update(k, v)));

      const failed = results
        .map((r, i) => ({ r, key: changed[i][0] }))
        .filter(({ r }) => r.status === 'rejected');

      if (failed.length > 0) {
        const firstError = failed[0].r as PromiseRejectedResult;
        const status = firstError.reason?.response?.status;
        const msg = status === 401
          ? 'Your session has expired. Please log in again to save changes.'
          : firstError.reason?.response?.data?.message
          || firstError.reason?.response?.data?.errors?.[0]
          || (!firstError.reason?.response ? 'Cannot reach the server. Check your connection.' : null)
          || `Failed to save: ${failed.map((f) => f.key).join(', ')}.`;
        showToast(msg, true);
        const failedKeys = new Set(failed.map((f) => f.key));
        const succeededKeys = changed.map(([k]) => k).filter((k) => !failedKeys.has(k));
        setSaved((prev) => {
          const next = { ...prev };
          succeededKeys.forEach((k) => { next[k] = settings[k]; });
          return next;
        });
      } else {
        setSaved({ ...settings });
        showToast('Settings saved successfully');
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string; errors?: string[] } } };
      const msg = e?.response?.status === 401
        ? 'Your session has expired. Please log in again to save changes.'
        : e?.response?.data?.message || e?.response?.data?.errors?.[0]
        || (!e?.response ? 'Cannot reach the server. Check your connection.' : 'Failed to save. Please try again.');
      showToast(msg, true);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#E6F0FA] flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-[#3B5BDB]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E6F0FA] p-4 md:p-8">
      <div className="max-w-[900px] mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-xl bg-white text-[#3B5BDB] border border-[#3B5BDB]/15 shadow-sm flex items-center justify-center">
              <SettingsIcon size={18} />
            </span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#0A1128] tracking-tight leading-none">Store Settings</h1>
              <p className="text-sm text-slate-500 mt-1.5">Configure your store details, tax, currency and features.</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-full bg-[#3B5BDB] hover:bg-[#2C46B8] disabled:opacity-50 text-white px-6 py-3 text-sm font-semibold shadow-sm transition-colors"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </header>

        {toast && (
          <div className={`flex items-center gap-2.5 text-sm px-4 py-3 rounded-xl border ${
            toastError ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {toastError ? <AlertTriangle size={16} className="flex-shrink-0" /> : <CheckCircle2 size={16} className="flex-shrink-0" />}
            <span className="flex-1">{toast}</span>
            {toastError && (
              <button onClick={() => setToast('')} className="text-rose-400 hover:text-rose-700" aria-label="Dismiss">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        <div className="space-y-6">
          <Section icon={Store} title="Store Information">
            <Field label="Store name">
              <input type="text" value={settings.StoreName} onFocus={() => set('StoreName', '')}
                onChange={(e) => set('StoreName', e.target.value)} placeholder="e.g. Ravi Electronics" className={inputCls} />
            </Field>
            <Field label="Contact email">
              <input type="email" value={settings.StoreEmail} onFocus={() => set('StoreEmail', '')}
                onChange={(e) => set('StoreEmail', e.target.value)} placeholder="store@example.com" className={inputCls} />
            </Field>
            <Field label="Contact phone">
              <input type="text" value={settings.StorePhone} onFocus={() => set('StorePhone', '')}
                onChange={(e) => set('StorePhone', e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
            </Field>
          </Section>

          <Section icon={DollarSign} title="Finance">
            <Field label="Tax rate" hint="e.g. 0.18 = 18% GST, 0 = no tax">
              <input type="number" step="0.01" min="0" max="1" value={settings.TaxRate}
                onFocus={() => set('TaxRate', '')} onChange={(e) => set('TaxRate', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Currency">
                <select
                  value={settings.Currency}
                  onChange={(e) => {
                    const cur = CURRENCIES.find((c) => c.code === e.target.value);
                    set('Currency', e.target.value);
                    if (cur) set('CurrencySymbol', cur.symbol);
                  }}
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.label} ({c.symbol})</option>
                  ))}
                </select>
              </Field>
              <Field label="Currency symbol" hint="Auto-filled from currency">
                <input type="text" value={settings.CurrencySymbol} onFocus={() => set('CurrencySymbol', '')}
                  onChange={(e) => set('CurrencySymbol', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section icon={Globe} title="General">
            <Field label="Timezone">
              <select value={settings.TimeZone} onChange={(e) => set('TimeZone', e.target.value)} className={inputCls}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Field>
          </Section>

          <Section icon={ShoppingBag} title="Orders">
            <Field label="Minimum order amount" hint="Set to 0 to allow any order amount">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{settings.CurrencySymbol}</span>
                <input type="number" min="0" value={settings.MinOrderAmount} onFocus={() => set('MinOrderAmount', '')}
                  onChange={(e) => set('MinOrderAmount', e.target.value)} className={`${inputCls} pl-7`} />
              </div>
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#E6F0FA]/70 border border-[#3B5BDB]/10 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#0A1128]">Shipping rates &amp; providers</p>
                <p className="text-xs text-slate-500 mt-0.5">Flat rate, free shipping threshold and courier API keys</p>
              </div>
              <a href="/vendor/shipping" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3B5BDB] hover:text-[#2C46B8] transition-colors flex-shrink-0">
                Go to Shipping <ExternalLink size={12} />
              </a>
            </div>
          </Section>

          <Section icon={MessageSquare} title="Features">
            <p className="text-xs text-slate-500 -mt-1">Guest checkout and wishlist are always on for every store and cannot be disabled.</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0A1128]">Product reviews</p>
                <p className="text-xs text-slate-500 mt-0.5">Allow customers to leave reviews on products</p>
              </div>
              <Toggle checked={settings.EnableReviews === 'true'} onChange={() => toggle('EnableReviews')} />
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
