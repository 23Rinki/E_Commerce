'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Store, DollarSign, Globe, ToggleLeft, ToggleRight, ShoppingBag, Truck, ExternalLink } from 'lucide-react';
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
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const DEFAULTS: SettingsMap = {
  StoreName: '',
  StoreEmail: '',
  StorePhone: '',
  TaxRate: '0.18',
  Currency: 'INR',
  CurrencySymbol: '₹',
  TimeZone: 'Asia/Kolkata',
  EnableReviews: 'true',
  MinOrderAmount: '0',
};

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

  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: string) =>
    set(key, settings[key] === 'true' ? 'false' : 'true');

  const showToast = (msg: string, error = false) => {
    setToast(msg);
    setToastError(error);
    // Errors need to stay readable long enough to actually act on — only auto-dismiss success toasts quickly.
    if (!error) setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Object.entries(settings).filter(
        ([k, v]) => v !== saved[k]
      );
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
        // Still mark whichever fields succeeded as saved, so retrying only resends the failed ones
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
    } catch (err: any) {
      const msg = err?.response?.status === 401
        ? 'Your session has expired. Please log in again to save changes.'
        : err?.response?.data?.message || err?.response?.data?.errors?.[0]
        || (!err?.response ? 'Cannot reach the server. Check your connection.' : 'Failed to save. Please try again.');
      showToast(msg, true);
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
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900">Store Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure your store details, tax, currency and features</p>
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

      {toast && (
        <div className={`mb-4 px-4 py-2.5 text-sm rounded-xl inline-flex items-center gap-3 ${toastError ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
          <span>{toast}</span>
          {toastError && (
            <button onClick={() => setToast('')} className="text-white/80 hover:text-white font-bold" aria-label="Dismiss">
              ✕
            </button>
          )}
        </div>
      )}

      <div className="space-y-5">

        {/* Store Info */}
        <Section icon={<Store size={15} className="text-slate-500" />} title="Store Information">
          <Field label="Store name">
            <input
              type="text"
              value={settings.StoreName}
              onFocus={() => set('StoreName', '')}
              onChange={(e) => set('StoreName', e.target.value)}
              placeholder="e.g. Ravi Electronics"
              className={inputCls}
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              value={settings.StoreEmail}
              onFocus={() => set('StoreEmail', '')}
              onChange={(e) => set('StoreEmail', e.target.value)}
              placeholder="store@example.com"
              className={inputCls}
            />
          </Field>
          <Field label="Contact phone">
            <input
              type="text"
              value={settings.StorePhone}
              onFocus={() => set('StorePhone', '')}
              onChange={(e) => set('StorePhone', e.target.value)}
              placeholder="+91 98765 43210"
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Finance */}
        <Section icon={<DollarSign size={15} className="text-slate-500" />} title="Finance">
          <Field label="Tax rate" hint="e.g. 0.18 = 18% GST, 0 = no tax">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={settings.TaxRate}
              onFocus={() => set('TaxRate', '')}
              onChange={(e) => set('TaxRate', e.target.value)}
              className={inputCls}
            />
          </Field>
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
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label} ({c.symbol})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency symbol" hint="Auto-filled when you pick a currency above">
            <input
              type="text"
              value={settings.CurrencySymbol}
              onFocus={() => set('CurrencySymbol', '')}
              onChange={(e) => set('CurrencySymbol', e.target.value)}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* General */}
        <Section icon={<Globe size={15} className="text-slate-500" />} title="General">
          <Field label="Timezone">
            <select
              value={settings.TimeZone}
              onChange={(e) => set('TimeZone', e.target.value)}
              className={inputCls}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Orders */}
        <Section icon={<ShoppingBag size={15} className="text-slate-500" />} title="Orders">
          <Field label="Minimum order amount" hint="Set to 0 to allow any order amount">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-6 text-right">{settings.CurrencySymbol}</span>
              <input
                type="number"
                min="0"
                value={settings.MinOrderAmount}
                onFocus={() => set('MinOrderAmount', '')}
                onChange={(e) => set('MinOrderAmount', e.target.value)}
                className={inputCls}
              />
            </div>
          </Field>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Shipping rates & providers</p>
              <p className="text-xs text-gray-400 mt-0.5">Flat rate, free shipping threshold and courier API keys</p>
            </div>
            <a href="/vendor/shipping" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors">
              Go to Shipping <ExternalLink size={12} />
            </a>
          </div>
        </Section>

        {/* Features */}
        <Section icon={<Truck size={15} className="text-slate-500" />} title="Features">
          <p className="text-xs text-gray-400 -mt-1 mb-1">Guest checkout and wishlist are always on for every store and cannot be disabled.</p>
          {[
            { key: 'EnableReviews', label: 'Product reviews', desc: 'Allow customers to leave reviews on products' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                className="flex-shrink-0 transition-colors"
                aria-label={`Toggle ${label}`}
              >
                {settings[key] === 'true'
                  ? <ToggleRight size={32} className="text-slate-800" />
                  : <ToggleLeft size={32} className="text-gray-300" />}
              </button>
            </div>
          ))}
        </Section>

      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400';

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-bold text-sm text-slate-900">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
