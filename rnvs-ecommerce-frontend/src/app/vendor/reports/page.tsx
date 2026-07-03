'use client';

import { useState, useEffect } from 'react';
import { vendorOrdersApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import { formatPrice } from '@/lib/utils';
import { TrendingUp, ShoppingBag, CreditCard, XCircle } from 'lucide-react';

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  totalPrice: number;
}

interface VendorOrder {
  id: number;
  totalAmount: number;
  status: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_MAP: Record<number, { label: string; color: string; bar: string }> = {
  1: { label: 'Pending',    color: 'text-yellow-700', bar: 'bg-yellow-400' },
  2: { label: 'Processing', color: 'text-blue-700',   bar: 'bg-blue-400'   },
  3: { label: 'Shipped',    color: 'text-indigo-700', bar: 'bg-indigo-400' },
  4: { label: 'Delivered',  color: 'text-green-700',  bar: 'bg-green-500'  },
  5: { label: 'Cancelled',  color: 'text-red-700',    bar: 'bg-red-400'    },
  6: { label: 'Refunded',   color: 'text-orange-700', bar: 'bg-orange-400' },
  7: { label: 'Returned',   color: 'text-gray-600',   bar: 'bg-gray-400'   },
};

function monthKey(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

function StatCard({ icon, label, value, sub, bg }: {
  icon: React.ReactNode; label: string; value: string; sub: string; bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-black text-slate-900">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { designation } = useVendorStore();
  useVendorAccess('reports', designation);

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorOrdersApi.getAll()
      .then(r => {
        const raw = r.data?.data ?? r.data ?? [];
        setOrders(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl space-y-6">
        <div className="h-8 w-44 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ── Aggregations ─────────────────────────────────────────────────────────
  const delivered     = orders.filter(o => o.status === 4);
  const cancelled     = orders.filter(o => o.status === 5).length;
  const totalRevenue  = delivered.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders   = orders.length;
  const avgOrderValue = totalOrders > 0
    ? orders.reduce((s, o) => s + o.totalAmount, 0) / totalOrders
    : 0;

  // Status breakdown
  const statusRows = Object.entries(STATUS_MAP)
    .map(([k, v]) => ({ ...v, count: orders.filter(o => o.status === Number(k)).length }))
    .filter(s => s.count > 0);
  const maxCount = Math.max(...statusRows.map(s => s.count), 1);

  // Monthly revenue — last 6 months
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const monthlyData = months.map(key => ({
    label: monthLabel(key),
    revenue: delivered
      .filter(o => monthKey(o.createdAt) === key)
      .reduce((s, o) => s + o.totalAmount, 0),
  }));
  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

  // Top 5 products by units sold (delivered orders only)
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const order of delivered) {
    for (const item of order.items ?? []) {
      if (!productMap[item.productId]) {
        productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      }
      productMap[item.productId].qty     += item.quantity;
      productMap[item.productId].revenue += item.totalPrice;
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-900">Sales Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Based on {totalOrders} orders in your store</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<TrendingUp size={17} className="text-green-500" />}
          label="Total Revenue" value={formatPrice(totalRevenue)}
          sub="from delivered orders" bg="bg-green-50"
        />
        <StatCard
          icon={<ShoppingBag size={17} className="text-blue-500" />}
          label="Total Orders" value={String(totalOrders)}
          sub={`${delivered.length} delivered`} bg="bg-blue-50"
        />
        <StatCard
          icon={<CreditCard size={17} className="text-purple-500" />}
          label="Avg Order Value" value={formatPrice(avgOrderValue)}
          sub="across all orders" bg="bg-purple-50"
        />
        <StatCard
          icon={<XCircle size={17} className="text-red-500" />}
          label="Cancelled" value={String(cancelled)}
          sub={`${totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0}% of orders`}
          bg="bg-red-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly revenue bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-5">Monthly Revenue — last 6 months</h2>
          {totalRevenue === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No delivered orders yet</p>
          ) : (
            <div className="flex items-end gap-2 h-44">
              {monthlyData.map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  {m.revenue > 0 && (
                    <span className="text-[9px] text-gray-400 font-medium text-center leading-tight">
                      {formatPrice(m.revenue)}
                    </span>
                  )}
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full bg-gray-100 rounded-t-lg" style={{ height: '100px' }}>
                      <div
                        className="w-full bg-slate-700 rounded-t-lg transition-all duration-500"
                        style={{
                          height: `${(m.revenue / maxRevenue) * 100}%`,
                          minHeight: m.revenue > 0 ? '4px' : '0',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-semibold">{m.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders by status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-5">Orders by Status</h2>
          {statusRows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No orders yet</p>
          ) : (
            <div className="space-y-3.5">
              {statusRows.map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                    <span className="text-xs text-gray-400">{s.count} order{s.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.bar} transition-all duration-500`}
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top 5 products */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Top 5 Selling Products</h2>
        {topProducts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No delivered orders yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-2.5 w-6">#</th>
                <th className="pb-2.5">Product</th>
                <th className="pb-2.5 text-right">Units Sold</th>
                <th className="pb-2.5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 text-gray-300 font-black text-base">{i + 1}</td>
                  <td className="py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="py-3 text-right text-gray-600 font-semibold">{p.qty}</td>
                  <td className="py-3 text-right font-bold text-slate-800">{formatPrice(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
