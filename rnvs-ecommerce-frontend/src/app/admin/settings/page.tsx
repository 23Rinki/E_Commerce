'use client';

import { useState } from 'react';
import { Settings, Shield, Bell, Database, Globe, Save, CheckCircle2 } from 'lucide-react';

interface SettingRow {
  label: string;
  description: string;
  key: string;
  type: 'toggle' | 'text' | 'select';
  options?: string[];
  value: string | boolean;
}

const INITIAL: SettingRow[] = [
  // Platform
  { label: 'Platform Name', description: 'Displayed in emails and receipts.', key: 'platformName', type: 'text', value: 'RNVS CommerceX' },
  { label: 'Support Email', description: 'Where vendor support requests go.', key: 'supportEmail', type: 'text', value: 'support@inovativeai.com' },
  { label: 'Default Currency', description: 'Currency used across the platform.', key: 'currency', type: 'select', options: ['INR', 'USD', 'EUR', 'GBP'], value: 'INR' },
  { label: 'Platform Commission (%)', description: 'Percentage taken from each vendor sale — none for now.', key: 'commission', type: 'text', value: '0' },
  // Security
  { label: 'Require Email Verification', description: 'Vendors must verify email before selling.', key: 'requireEmailVerification', type: 'toggle', value: true },
  { label: 'Two-Factor Authentication', description: 'Force 2FA for all admin accounts.', key: 'require2FA', type: 'toggle', value: false },
  { label: 'JWT Expiry (minutes)', description: 'How long authentication tokens last.', key: 'jwtExpiry', type: 'text', value: '60' },
  // Notifications
  { label: 'New Vendor Alerts', description: 'Email admin when a new vendor registers.', key: 'newVendorAlert', type: 'toggle', value: true },
  { label: 'Inactive Vendor Alerts', description: 'Alert when a vendor is inactive for 30+ days.', key: 'inactiveAlert', type: 'toggle', value: true },
  // Infrastructure
  { label: 'Default Storage', description: 'Where vendor files are stored.', key: 'storage', type: 'select', options: ['Local', 'Azure Blob', 'AWS S3'], value: 'Local' },
  { label: 'Cache Provider', description: 'Caching layer for API responses.', key: 'cache', type: 'select', options: ['Memory', 'Redis'], value: 'Memory' },
  { label: 'Search Provider', description: 'Product search implementation.', key: 'search', type: 'select', options: ['SQL', 'Elasticsearch'], value: 'SQL' },
];

const SECTIONS = [
  { label: 'Platform', icon: Globe, keys: ['platformName', 'supportEmail', 'currency', 'commission'] },
  { label: 'Security', icon: Shield, keys: ['requireEmailVerification', 'require2FA', 'jwtExpiry'] },
  { label: 'Notifications', icon: Bell, keys: ['newVendorAlert', 'inactiveAlert'] },
  { label: 'Infrastructure', icon: Database, keys: ['storage', 'cache', 'search'] },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingRow[]>(INITIAL);
  const [saved, setSaved] = useState(false);

  const update = (key: string, value: string | boolean) => {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s));
    setSaved(false);
  };

  const handleSave = () => {
    // In production, POST to /api/admin/settings
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const byKey = Object.fromEntries(settings.map((s) => [s.key, s]));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure global platform behaviour</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(({ label, icon: Icon, keys }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50 bg-gray-50/50">
              <Icon size={15} className="text-orange-500" />
              <span className="text-sm font-bold text-slate-700">{label}</span>
            </div>

            <div className="divide-y divide-gray-50">
              {keys.map((key) => {
                const s = byKey[key];
                if (!s) return null;
                return (
                  <div key={key} className="flex items-center justify-between gap-6 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                    </div>

                    {s.type === 'toggle' && (
                      <button
                        onClick={() => update(key, !s.value)}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${s.value ? 'bg-orange-500' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.value ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    )}

                    {s.type === 'text' && (
                      <input
                        type="text"
                        value={s.value as string}
                        onChange={(e) => update(key, e.target.value)}
                        className="w-52 px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition-colors text-right"
                      />
                    )}

                    {s.type === 'select' && (
                      <select
                        value={s.value as string}
                        onChange={(e) => update(key, e.target.value)}
                        className="w-40 px-3 py-1.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400 transition-colors"
                      >
                        {s.options?.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        <Settings size={11} className="inline mr-1" />
        Some settings require a server restart to take effect.
      </p>
    </div>
  );
}
