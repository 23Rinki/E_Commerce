'use client';

import { useEffect, useState, useCallback } from 'react';
import { vendorSettingsApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import { Truck, Check, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

// ── Provider definitions ─────────────────────────────────────────────────────

interface ProviderField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

interface Provider {
  id: string;
  name: string;
  logo: string;
  description: string;
  fields: ProviderField[];
}

const PROVIDERS: Provider[] = [
  {
    id: 'bluedart',
    name: 'Blue Dart',
    logo: '🔵',
    description: 'Premium express delivery across India',
    fields: [
      { key: 'apiKey',     label: 'API Key',     placeholder: 'Enter your Blue Dart API key',     secret: true },
      { key: 'customerId', label: 'Customer ID',  placeholder: 'Enter your Blue Dart Customer ID' },
    ],
  },
  {
    id: 'delhivery',
    name: 'Delhivery',
    logo: '🔴',
    description: 'Pan-India courier and logistics service',
    fields: [
      { key: 'apiKey', label: 'API Token', placeholder: 'Enter your Delhivery API token', secret: true },
    ],
  },
  {
    id: 'dtdc',
    name: 'DTDC',
    logo: '🟠',
    description: 'Reliable courier service with wide reach',
    fields: [
      { key: 'apiKey',     label: 'API Key',       placeholder: 'Enter your DTDC API key',        secret: true },
      { key: 'customerId', label: 'Customer Code',  placeholder: 'Enter your DTDC Customer Code' },
    ],
  },
  {
    id: 'fedex',
    name: 'FedEx',
    logo: '🟣',
    description: 'International and domestic express shipping',
    fields: [
      { key: 'apiKey',        label: 'API Key',        placeholder: 'Enter your FedEx API key',        secret: true },
      { key: 'accountNumber', label: 'Account Number', placeholder: 'Enter your FedEx Account Number' },
    ],
  },
  {
    id: 'ups',
    name: 'UPS',
    logo: '🟤',
    description: 'Global package delivery and logistics',
    fields: [
      { key: 'apiKey',   label: 'API Key',  placeholder: 'Enter your UPS API key',  secret: true },
      { key: 'username', label: 'Username', placeholder: 'Enter your UPS username' },
      { key: 'password', label: 'Password', placeholder: 'Enter your UPS password', secret: true },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function settingKey(providerId: string, field: string) {
  return `shipping.${providerId}.${field}`;
}

// ── Provider card ────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  settings,
  onSave,
}: {
  provider: Provider;
  settings: Record<string, string>;
  onSave: (providerId: string, fields: Record<string, string>, enabled: boolean) => Promise<void>;
}) {
  const enabledKey = settingKey(provider.id, 'enabled');
  const [enabled, setEnabled]     = useState(settings[enabledKey] === 'true');
  const [form, setForm]           = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of provider.fields) init[f.key] = settings[settingKey(provider.id, f.key)] ?? '';
    return init;
  });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await onSave(provider.id, form, enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const allFilled = provider.fields.every((f) => form[f.key]?.trim());

  return (
    <div className={`bg-white rounded-2xl border transition-all ${enabled ? 'border-slate-300 shadow-sm' : 'border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{provider.logo}</span>
          <div>
            <p className="font-bold text-slate-900 text-sm">{provider.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{provider.description}</p>
          </div>
        </div>
        {/* Toggle */}
        <button
          onClick={() => setEnabled((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-slate-900' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Fields — always visible so vendor can pre-fill before enabling */}
      <div className="px-5 py-4 space-y-3">
        {provider.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
            <div className="relative">
              <input
                type={field.secret && !showSecret[field.key] ? 'password' : 'text'}
                value={form[field.key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-100 pr-9"
              />
              {field.secret && (
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => ({ ...s, [field.key]: !s[field.key] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600"
                >
                  {showSecret[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          {enabled && !allFilled && (
            <p className="text-xs text-amber-600">Fill all fields to activate this provider</p>
          )}
          {!enabled && <span />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition-colors ml-auto"
          >
            {saving
              ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
              : saved
                ? <><Check size={12} /> Saved</>
                : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── InHouse card ─────────────────────────────────────────────────────────────

function InHouseCard({
  settings,
  onSave,
}: {
  settings: Record<string, string>;
  onSave: (fields: Record<string, string>, enabled: boolean) => Promise<void>;
}) {
  const [enabled, setEnabled]     = useState(settings['shipping.inhouse.enabled'] !== 'false');
  const [flatRate, setFlatRate]   = useState(settings['ShippingFlatRate'] ?? '50');
  const [threshold, setThreshold] = useState(settings['FreeShippingThreshold'] ?? '1000');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');

  const handleSave = async () => {
    if (!flatRate || !threshold) { setError('Both fields are required.'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      await onSave({ ShippingFlatRate: flatRate, FreeShippingThreshold: threshold }, enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all ${enabled ? 'border-slate-900' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏠</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900 text-sm">InHouse Shipping</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">Default</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Your own delivery, flat-rate pricing</p>
          </div>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-slate-900' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Flat Rate (₹)</label>
            <input
              type="number" min={0} value={flatRate}
              onChange={(e) => setFlatRate(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Free Shipping Above (₹)</label>
            <input
              type="number" min={0} value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-100"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Orders above ₹{threshold || '—'} get free shipping. Others are charged ₹{flatRate || '—'}.
        </p>
        <div className="bg-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 space-y-2">
          <p className="font-bold text-white">These rates apply only when InHouse is your active provider.</p>
          <div className="space-y-1 text-slate-300">
            <p>🏠 <span className="font-semibold text-white">InHouse enabled</span> — charges ₹{flatRate || '—'} flat, free above ₹{threshold || '—'} (your own delivery, your own pricing)</p>
            <p>🚚 <span className="font-semibold text-white">External provider enabled</span> (e.g. BlueDart) — shipping cost comes from BlueDart's API based on pincode, weight, dimensions — your flat rate is ignored</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition-colors"
          >
            {saving
              ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
              : saved
                ? <><Check size={12} /> Saved</>
                : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VendorShippingPage() {
  const { designation } = useVendorStore();
  useVendorAccess('shipping', designation);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorSettingsApi.getAll();
      const raw: { key: string; value: string }[] = res.data?.data ?? res.data ?? [];
      const map: Record<string, string> = {};
      for (const s of raw) map[s.key] = s.value;
      setSettings(map);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleProviderSave = async (providerId: string, fields: Record<string, string>, enabled: boolean) => {
    const updates: [string, string][] = [
      [settingKey(providerId, 'enabled'), String(enabled)],
      ...Object.entries(fields).map(([k, v]): [string, string] => [settingKey(providerId, k), v]),
    ];
    await Promise.all(updates.map(([key, value]) => vendorSettingsApi.update(key, value)));
    setSettings((prev) => {
      const next = { ...prev };
      for (const [k, v] of updates) next[k] = v;
      return next;
    });
  };

  const handleInhouseSave = async (fields: Record<string, string>, enabled: boolean) => {
    const updates: [string, string][] = [
      ['shipping.inhouse.enabled', String(enabled)],
      ...Object.entries(fields).map(([k, v]): [string, string] => [k, v]),
    ];
    await Promise.all(updates.map(([key, value]) => vendorSettingsApi.update(key, value)));
    setSettings((prev) => {
      const next = { ...prev };
      for (const [k, v] of updates) next[k] = v;
      return next;
    });
  };

  // Warning: no provider active at all
  const inhouseOn   = settings['shipping.inhouse.enabled'] !== 'false';
  const anyExternal = PROVIDERS.some((p) => settings[settingKey(p.id, 'enabled')] === 'true');
  const noneActive  = !inhouseOn && !anyExternal;

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Truck size={20} className="text-slate-700" />
          <h1 className="text-xl font-black text-slate-900">Shipping</h1>
        </div>
        <p className="text-sm text-gray-400">
          Manage your shipping methods. Enable InHouse for flat-rate delivery or connect an external courier with your API credentials.
        </p>
      </div>

      {/* Warning — no active provider */}
      {!loading && noneActive && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-800">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold">No shipping method is active</p>
            <p className="text-xs text-red-700 mt-0.5">
              Customers will not be able to complete checkout. Enable InHouse shipping or at least one external provider.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* InHouse first */}
          <InHouseCard settings={settings} onSave={handleInhouseSave} />

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">External Couriers</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* External providers */}
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              settings={settings}
              onSave={handleProviderSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
