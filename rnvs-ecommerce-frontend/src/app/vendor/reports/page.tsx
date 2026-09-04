'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  XCircle,
  RefreshCw,
  Package,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { vendorOrdersApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import { formatPrice } from '@/lib/utils';

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  totalPrice: number;
}

interface VendorOrder {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_MAP: Record<number, { label: string; text: string; bar: string }> = {
  1: { label: 'Pending',    text: 'text-amber-700',   bar: 'bg-amber-400'   },
  2: { label: 'Processing', text: 'text-amber-700',   bar: 'bg-amber-400'   },
  3: { label: 'Shipped',    text: 'text-[#3B5BDB]',   bar: 'bg-[#3B5BDB]'   },
  4: { label: 'Delivered',  text: 'text-emerald-700', bar: 'bg-emerald-500' },
  5: { label: 'Cancelled',  text: 'text-rose-700',    bar: 'bg-rose-500'    },
  6: { label: 'Refunded',   text: 'text-orange-700',  bar: 'bg-orange-400'  },
  7: { label: 'Returned',   text: 'text-slate-600',   bar: 'bg-slate-400'   },
};

function monthKey(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short' });
}

function KpiCard({ icon: Icon, label, value, hint, tone }: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  hint: string;
  tone: { bg: string; ring: string; icon: string };
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${tone.bg} ring-1 ${tone.ring} border border-white/60 p-5 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${tone.icon}`}>
          <Icon size={16} />
        </span>
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <div className="text-3xl font-bold text-[#0A1128] leading-none">{value}</div>
      <div className="text-xs text-slate-500 mt-2">{hint}</div>
      <span className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/50 blur-2xl pointer-events-none" />
    </div>
  );
}

export default function ReportsPage() {
  const { designation } = useVendorStore();
  useVendorAccess('reports', designation);

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');

  const fetchOrders = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    return vendorOrdersApi.getAll()
      .then((r) => {
        const raw = r.data?.data ?? r.data ?? [];
        setOrders(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setOrders([]))
      .finally(() => {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      });
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = useMemo(
    () => statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter],
  );

  const {
    totalRevenue, totalOrders, delivered, avgOrderValue, cancelled,
    statusRows, monthlyData, hasChartData, topProducts,
  } = useMemo(() => {
    const orders = filteredOrders;
    const delivered = orders.filter((o) => o.status === 4);
    const cancelled = orders.filter((o) => o.status === 5).length;
    const totalRevenue = delivered.reduce((s, o) => s + o.totalAmount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0
      ? orders.reduce((s, o) => s + o.totalAmount, 0) / totalOrders
      : 0;

    const statusRows = Object.entries(STATUS_MAP)
      .map(([k, v]) => ({ ...v, count: orders.filter((o) => o.status === Number(k)).length }))
      .filter((s) => s.count > 0);
    const totalStatusOrders = statusRows.reduce((s, x) => s + x.count, 0) || 1;

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const monthlyData = months.map((key) => ({
      m: monthLabel(key),
      revenue: delivered.filter((o) => monthKey(o.createdAt) === key).reduce((s, o) => s + o.totalAmount, 0),
    }));
    const hasChartData = monthlyData.some((d) => d.revenue > 0);

    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const order of delivered) {
      for (const item of order.items ?? []) {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        }
        productMap[item.productId].qty += item.quantity;
        productMap[item.productId].revenue += item.totalPrice;
      }
    }
    const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return {
      totalRevenue, totalOrders, delivered, avgOrderValue, cancelled,
      statusRows: statusRows.map((s) => ({ ...s, pct: (s.count / totalStatusOrders) * 100, total: totalStatusOrders })),
      monthlyData, hasChartData, topProducts,
    };
  }, [filteredOrders]);

  const handleDownloadCsv = () => {
    const header = ['Order Number', 'Date', 'Status', 'Items', 'Amount'];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      STATUS_MAP[o.status]?.label ?? o.status,
      String(o.items?.reduce((s, i) => s + i.quantity, 0) ?? 0),
      o.totalAmount.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix = statusFilter === 'all' ? 'all' : (STATUS_MAP[statusFilter]?.label ?? 'filtered').toLowerCase();
    link.download = `sales-report-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const KPI = [
    {
      key: 'revenue', label: 'Total Revenue', value: formatPrice(totalRevenue), hint: 'from delivered orders',
      icon: TrendingUp, tone: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', icon: 'text-emerald-600 bg-emerald-100' },
    },
    {
      key: 'orders', label: 'Total Orders', value: String(totalOrders), hint: `${delivered.length} delivered`,
      icon: ShoppingBag, tone: { bg: 'bg-[#E6F0FA]', ring: 'ring-blue-100', icon: 'text-[#3B5BDB] bg-white' },
    },
    {
      key: 'aov', label: 'Avg Order Value', value: formatPrice(avgOrderValue), hint: 'across all orders',
      icon: CreditCard, tone: { bg: 'bg-violet-50', ring: 'ring-violet-100', icon: 'text-violet-600 bg-violet-100' },
    },
    {
      key: 'cancelled', label: 'Cancelled', value: String(cancelled),
      hint: `${totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0}% of orders`,
      icon: XCircle, tone: { bg: 'bg-rose-50', ring: 'ring-rose-100', icon: 'text-rose-600 bg-rose-100' },
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#E6F0FA] p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-8">
          <div className="h-10 w-56 bg-white/60 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-white/60 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 bg-white/60 rounded-2xl animate-pulse" />
            <div className="h-72 bg-white/60 rounded-2xl animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E6F0FA] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0A1128] tracking-tight">Sales Reports</h1>
            <p className="text-sm text-slate-500 mt-1">
              Based on <span className="font-semibold text-[#0A1128]">{totalOrders} order{totalOrders !== 1 ? 's' : ''}</span> in your store
              {statusFilter !== 'all' && <> · filtered to <span className="font-semibold text-[#0A1128]">{STATUS_MAP[statusFilter]?.label}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="h-[38px] rounded-full bg-white/80 hover:bg-white border border-[#3B5BDB]/15 px-4 text-sm font-medium text-[#3B5BDB] shadow-sm transition-colors focus:outline-none"
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredOrders.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 hover:bg-white border border-[#3B5BDB]/15 px-4 py-2 text-sm font-medium text-[#3B5BDB] shadow-sm transition-colors disabled:opacity-60"
            >
              <Download size={14} /> Download
            </button>
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 hover:bg-white border border-[#3B5BDB]/15 px-4 py-2 text-sm font-medium text-[#3B5BDB] shadow-sm transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        {/* KPI cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {KPI.map(({ key, ...props }) => <KpiCard key={key} {...props} />)}
        </section>

        {/* Monthly revenue + orders by status */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0A1128]">Monthly Revenue</h2>
                <p className="text-xs text-slate-500 mt-0.5">last 6 months</p>
              </div>
              {hasChartData && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
                  <ArrowUpRight size={12} /> live
                </span>
              )}
            </div>

            <div className="h-56">
              {hasChartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B5BDB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3B5BDB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E6F0FA" vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => formatPrice(Number(value))}
                      contentStyle={{ background: '#fff', border: '1px solid rgba(59,91,219,0.15)', borderRadius: 12, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3B5BDB" strokeWidth={2.5} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400 border border-dashed border-[#3B5BDB]/15 rounded-xl">
                  No delivered orders yet
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[#0A1128]">Orders by Status</h2>
              <span className="text-xs text-slate-500">{statusRows[0]?.total ?? 0} total</span>
            </div>

            {statusRows.length === 0 ? (
              <div className="py-14 text-center text-sm text-slate-400 border border-dashed border-[#3B5BDB]/15 rounded-xl">
                No orders yet
              </div>
            ) : (
              <div className="space-y-5">
                {statusRows.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
                      <span className="text-xs text-slate-500">{s.count} {s.count === 1 ? 'order' : 'orders'}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`${s.bar} h-full rounded-full transition-[width] duration-500`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Top 5 selling products */}
        <section className="bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-[#0A1128]">Top 5 Selling Products</h2>
              <p className="text-xs text-slate-500 mt-0.5">By units delivered</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3B5BDB] bg-[#E6F0FA] rounded-full px-3 py-1">
              <Package size={12} /> All time
            </span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-400 border border-dashed border-[#3B5BDB]/15 rounded-xl">
              No delivered orders yet
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topProducts.map((p, i) => (
                <li key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-lg bg-[#E6F0FA] text-[#3B5BDB] font-semibold text-sm flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-[#0A1128]">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.qty} units sold</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[#0A1128]">{formatPrice(p.revenue)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
