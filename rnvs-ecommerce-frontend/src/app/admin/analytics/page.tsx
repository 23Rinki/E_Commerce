'use client';

import { useEffect, useState } from 'react';
import { platformAdminApi } from '@/lib/api';
import {
  TrendingUp, Users, ShoppingBag, DollarSign,
  BarChart2, Activity, ArrowUpRight, ArrowDownRight, Loader2, Database, Link,
  IndianRupee, AlertCircle, PackageX,
} from 'lucide-react';

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

interface Tenant {
  id: number;
  storeName: string;
  vendorName?: string;
  contactEmail: string;
  plan: string;
  status: string;
  hasDedicatedDb: boolean;
  railwayServiceId?: string;
  storagePrefix: string;
}

interface VendorSales {
  tenantId: number;
  storeName: string;
  vendorName?: string;
  totalSales: number | null;
  totalOrders: number | null;
  dbStatus: 'ok' | 'not_provisioned' | 'error';
}

interface SalesSummary {
  grandTotal: number;
  vendorCount: number;
  vendors: VendorSales[];
}

interface Stats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  withDedicatedDb: number;
  activeLast7Days: number;
  inactive30Days: number;
  pendingMaintenance: number;
}

function StatCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend === 'up' ? 'text-green-500' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-neutral-900 mt-3">{value}</p>
      <p className="text-sm font-medium text-neutral-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}


export default function AdminAnalyticsPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [tenants, setTenants]     = useState<Tenant[]>([]);
  const [sales, setSales]         = useState<SalesSummary | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.allSettled([
      platformAdminApi.getStats(),
      platformAdminApi.getTenants({}),
    ]).then(([sRes, tRes]) => {
      if (sRes.status === 'fulfilled') setStats(sRes.value.data?.data || sRes.value.data);
      if (tRes.status === 'fulfilled') setTenants(tRes.value.data?.data || tRes.value.data || []);
    }).finally(() => setLoading(false));

    platformAdminApi.getSalesSummary()
      .then((r) => {
        const d = r.data?.data || r.data;
        setSales(d && Array.isArray(d.vendors) ? d : null); // anything unexpected → "no sales data" state
      })
      .catch(() => setSales(null))
      .finally(() => setSalesLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-neutral-300" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-neutral-400">
        <BarChart2 size={36} className="mx-auto mb-2 opacity-30" />
        <p>Could not load analytics. Make sure the backend is running.</p>
      </div>
    );
  }

  const healthPct = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Admin</div>
        <h1 className="font-display tracking-tight text-3xl lg:text-4xl mt-1 text-neutral-900">Platform Analytics</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Overview of all vendors and platform health</p>
      </div>

      {/* Sales Overview */}
      <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IndianRupee size={15} className="text-neutral-500" />
            <h2 className="font-display tracking-tight text-base text-neutral-800">Sales Overview</h2>
            <span className="text-xs text-neutral-400 ml-1">Per vendor + platform total</span>
          </div>
          {!salesLoading && sales && (
            <div className="text-right">
              <p className="text-xs text-neutral-400">Platform Total</p>
              <p className="text-xl font-semibold text-neutral-900">{formatINR(sales.grandTotal)}</p>
            </div>
          )}
        </div>

        {salesLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-neutral-300" />
          </div>
        )}

        {!salesLoading && !sales && (
          <div className="flex items-center gap-2 px-6 py-5 text-sm text-red-500">
            <AlertCircle size={15} /> Could not load sales data.
          </div>
        )}

        {!salesLoading && sales && sales.vendors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <PackageX size={28} className="text-neutral-200 mb-2" />
            <p className="text-sm text-neutral-400">No vendors found</p>
          </div>
        )}

        {!salesLoading && sales && sales.vendors.length > 0 && (
          <div className="divide-y divide-neutral-50">
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide bg-neutral-50">
              <span>Store</span>
              <span className="w-24 text-right">Orders</span>
              <span className="w-32 text-right">Total Sales</span>
              <span className="w-24 text-right">DB Status</span>
            </div>

            {sales.vendors.map((v, i) => (
              <div key={v.tenantId} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-6 py-3.5 items-center">
                {/* Store info */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{v.storeName}</p>
                  {v.vendorName && <p className="text-xs text-neutral-400 truncate">{v.vendorName}</p>}
                </div>

                {/* Orders */}
                <div className="w-24 text-right">
                  <span className="text-sm font-medium text-neutral-700">
                    {v.totalOrders != null ? v.totalOrders : '—'}
                  </span>
                </div>

                {/* Total sales */}
                <div className="w-32 text-right">
                  {v.dbStatus === 'ok' && v.totalSales != null && (
                    <span className="text-sm font-semibold text-green-700">{formatINR(v.totalSales)}</span>
                  )}
                  {v.dbStatus === 'not_provisioned' && (
                    <span className="text-xs text-neutral-400">DB not set up</span>
                  )}
                  {v.dbStatus === 'error' && (
                    <span className="text-xs text-red-400">Unavailable</span>
                  )}
                </div>

                {/* DB status badge */}
                <div className="w-24 text-right">
                  {v.dbStatus === 'ok' && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Connected</span>
                  )}
                  {v.dbStatus === 'not_provisioned' && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">No DB</span>
                  )}
                  {v.dbStatus === 'error' && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Error</span>
                  )}
                </div>
              </div>
            ))}

            {/* Grand total row */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-4 bg-neutral-50 items-center">
              <p className="text-sm font-semibold text-neutral-900">Platform Grand Total</p>
              <div className="w-24 text-right">
                <span className="text-sm font-semibold text-neutral-700">
                  {sales.vendors.reduce((s, v) => s + (v.totalOrders ?? 0), 0)} orders
                </span>
              </div>
              <div className="w-32 text-right">
                <span className="text-base font-semibold text-neutral-900">{formatINR(sales.grandTotal)}</span>
              </div>
              <div className="w-24" />
            </div>
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Vendors" value={stats.total} icon={Users} color="bg-neutral-800" />
        <StatCard label="Active Vendors" value={stats.active} sub={`${healthPct}% of total`} icon={Activity} color="bg-green-500" trend="up" />
        <StatCard label="Active (Last 7d)" value={stats.activeLast7Days} sub="Recently logged in" icon={TrendingUp} color="bg-neutral-900" />
        <StatCard label="Inactive 30d+" value={stats.inactive30Days} sub="Need follow-up" icon={ShoppingBag} color="bg-red-400" trend="down" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Activity breakdown */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          <h2 className="font-display tracking-tight text-base text-neutral-800 mb-4">Activity Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Active this week', value: stats.activeLast7Days, cls: 'bg-green-100 text-green-700' },
              { label: 'On trial', value: stats.trial, cls: 'bg-blue-100 text-blue-700' },
              { label: 'Inactive 30d+', value: stats.inactive30Days, cls: 'bg-yellow-100 text-yellow-700' },
              { label: 'Suspended', value: stats.suspended, cls: 'bg-red-100 text-red-600' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cls.split(' ')[0].replace('100', '400')}`}
                      style={{ width: stats.total > 0 ? `${(value / stats.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-neutral-700 w-6 text-right">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vendor Infrastructure — URL & DB per vendor */}
      {tenants.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
            <Database size={15} className="text-neutral-500" />
            <h2 className="font-display tracking-tight text-base text-neutral-800">Vendor Infrastructure</h2>
            <span className="text-xs text-neutral-400 ml-1">Store URLs &amp; databases</span>
          </div>
          <div className="divide-y divide-neutral-50">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_auto] gap-4 px-6 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide bg-neutral-50">
              <span>Store</span>
              <span>Store URL</span>
              <span className="w-40">Database</span>
            </div>
            {tenants.map((t) => {
              const slug = t.storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              const dbLabel = t.hasDedicatedDb
                ? 'Railway PostgreSQL'
                : `Local — ${(t.storagePrefix ?? '').replace(/^vendor-/, 'RNVSVendor_') || 'Shared'}`;
              return (
                <div key={t.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-4 px-6 py-3 items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 truncate">{t.storeName}</p>
                    {t.vendorName && <p className="text-xs text-neutral-400 truncate">{t.vendorName}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link size={11} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-xs text-indigo-600 font-mono truncate">
                      inovativeai.com/<span className="font-semibold">{slug}</span>
                    </span>
                    <span className="text-[9px] text-neutral-400 flex-shrink-0">(slug pending)</span>
                  </div>
                  <div className="w-40 flex items-center gap-1.5">
                    <Database size={11} className={t.hasDedicatedDb ? 'text-blue-500' : 'text-neutral-400'} />
                    <span className={`text-xs font-medium truncate ${t.hasDedicatedDb ? 'text-blue-600' : 'text-neutral-500'}`}>
                      {dbLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Infrastructure & support */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-semibold text-neutral-900">{stats.withDedicatedDb}</p>
            <p className="text-sm text-neutral-500">Dedicated DBs</p>
            <p className="text-xs text-neutral-400">Railway PostgreSQL</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-semibold text-neutral-900">{stats.pendingMaintenance}</p>
            <p className="text-sm text-neutral-500">Pending Support</p>
            <p className="text-xs text-neutral-400">Maintenance notes</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-semibold text-neutral-900">{healthPct}%</p>
            <p className="text-sm text-neutral-500">Platform Health</p>
            <p className="text-xs text-neutral-400">Active / Total vendors</p>
          </div>
        </div>
      </div>
    </div>
  );
}
