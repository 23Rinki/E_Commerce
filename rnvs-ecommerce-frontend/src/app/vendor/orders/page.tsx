'use client';

import { useEffect, useState } from 'react';
import { vendorOrdersApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import { formatPrice } from '@/lib/utils';
import {
  ShoppingBag, ChevronDown, ChevronUp, Search,
  Loader2, AlertCircle, RefreshCw, FileText,
} from 'lucide-react';
import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface VendorOrder {
  id: number;
  orderNumber: string;
  userId: string;
  customerEmail?: string;
  customerPhone?: string;
  subTotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  status: number;
  createdAt: string;
  items: OrderItem[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Pending',    color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
  3: { label: 'Shipped',    color: 'bg-indigo-100 text-indigo-700' },
  4: { label: 'Delivered',  color: 'bg-green-100 text-green-700' },
  5: { label: 'Cancelled',  color: 'bg-red-100 text-red-700' },
  6: { label: 'Refunded',   color: 'bg-orange-100 text-orange-700' },
  7: { label: 'Returned',   color: 'bg-gray-100 text-gray-600' },
};

const STATUS_TABS = [
  { label: 'All',        value: null },
  { label: 'Pending',    value: 1 },
  { label: 'Processing', value: 2 },
  { label: 'Shipped',    value: 3 },
  { label: 'Delivered',  value: 4 },
  { label: 'Cancelled',  value: 5 },
];

const UPDATABLE_STATUSES = [
  { label: 'Pending',    value: 1 },
  { label: 'Processing', value: 2 },
  { label: 'Shipped',    value: 3 },
  { label: 'Delivered',  value: 4 },
  { label: 'Cancelled',  value: 5 },
  { label: 'Refunded',   value: 6 },
  { label: 'Returned',   value: 7 },
];

function apiError(err: any, fallback: string): string {
  if (!err?.response) return 'Cannot reach the server. Check your connection.';
  return err?.response?.data?.message || fallback;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VendorOrdersPage() {
  const { designation } = useVendorStore();
  useVendorAccess('orders', designation);

  const [orders, setOrders]           = useState<VendorOrder[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState<number | null>(null);
  const [search, setSearch]           = useState('');
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [updating, setUpdating]       = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<Record<number, string>>({});
  const [invoiceLoading, setInvoiceLoading] = useState<number | null>(null);

  const handleDownloadInvoice = async (orderId: number) => {
    setInvoiceLoading(orderId);
    try {
      const res = await api.get(`/api/invoices/generate/${orderId}`, {
        responseType: 'text',
        headers: { Accept: 'text/html' },
      });
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(res.data as string);
        win.document.close();
      }
    } catch {
      alert('Failed to generate invoice. Make sure a template is set at Vendor → Invoices.');
    } finally {
      setInvoiceLoading(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await vendorOrdersApi.getAll();
      const data: VendorOrder[] = r.data?.data ?? r.data ?? [];
      setOrders(data);
    } catch (err: any) {
      setError(apiError(err, 'Failed to load orders.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusUpdate = async (orderId: number, newStatus: number) => {
    setUpdating(orderId);
    setUpdateError((prev) => ({ ...prev, [orderId]: '' }));
    try {
      await vendorOrdersApi.updateStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o)
      );
    } catch (err: any) {
      setUpdateError((prev) => ({
        ...prev,
        [orderId]: apiError(err, 'Failed to update status.'),
      }));
    } finally {
      setUpdating(null);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = orders.filter((o) => {
    const matchesTab = activeTab === null || o.status === activeTab;
    const matchesSearch = search.trim() === '' ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and update your customer orders
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-slate-800 transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === null
            ? orders.length
            : orders.filter((o) => o.status === tab.value).length;
          return (
            <button
              key={String(tab.value)}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                ${activeTab === tab.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-slate-700'}`}
            >
              {tab.label}
              <span className={`ml-1.5 ${activeTab === tab.value ? 'text-slate-300' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin text-slate-400" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag size={36} className="text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-400">No orders found</p>
          <p className="text-xs text-gray-300 mt-1">
            {search ? 'Try a different order number' : 'Orders will appear here once customers place them'}
          </p>
        </div>
      )}

      {/* Order list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((order) => {
            const status = STATUS_MAP[order.status] ?? { label: 'Unknown', color: 'bg-gray-100 text-gray-500' };
            const isExpanded = expanded === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
              >
                {/* Order row */}
                <div className="flex items-center gap-4 px-5 py-4">

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{order.orderNumber}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>·</span>
                      <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Status update + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {updating === order.id ? (
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    ) : (
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, Number(e.target.value))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                      >
                        {UPDATABLE_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    )}

                    {/* Download Invoice */}
                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      disabled={invoiceLoading === order.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      {invoiceLoading === order.id
                        ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                        : <><FileText size={12} /> Invoice</>}
                    </button>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : order.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-gray-50 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Update error */}
                {updateError[order.id] && (
                  <div className="px-5 pb-3 text-xs text-red-500">{updateError[order.id]}</div>
                )}

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-gray-50 px-5 py-4 bg-gray-50">
                    {(order.customerEmail || order.customerPhone) && (
                      <div className="mb-4 pb-3 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Customer Contact</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                          {order.customerEmail && <span>{order.customerEmail}</span>}
                          {order.customerPhone && <span>{order.customerPhone}</span>}
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Items</p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 font-medium">{item.productName}</span>
                          <div className="flex items-center gap-4 text-gray-500 text-xs">
                            <span>Qty: {item.quantity}</span>
                            <span>@ {formatPrice(item.unitPrice)}</span>
                            <span className="font-semibold text-slate-700">{formatPrice(item.totalPrice)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Price breakdown */}
                    <div className="mt-4 pt-3 border-t border-gray-200 space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatPrice(order.subTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{formatPrice(order.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>{formatPrice(order.shippingCost)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-800 text-sm pt-1 border-t border-gray-200">
                        <span>Total</span>
                        <span>{formatPrice(order.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!loading && !error && orders.length > 0 && (
        <div className="mt-6 bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing {filtered.length} of {orders.length} orders
          </span>
          <span className="text-sm font-bold text-slate-900">
            Total Revenue: {formatPrice(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
          </span>
        </div>
      )}
    </div>
  );
}
