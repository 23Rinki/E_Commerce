'use client';

import { useEffect, useState } from 'react';
import { vendorOrdersApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import { formatPrice } from '@/lib/utils';
import {
  ShoppingBag, ChevronDown, ChevronUp, Search,
  Loader2, AlertCircle, RefreshCw, FileText, Download, X,
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
  vendorId?: string;
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
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const handleDownloadPdf = async (orderId: number, orderNumber: string) => {
    setPdfLoading(orderId);
    try {
      const res = await api.get(`/api/invoices/download/${orderId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download PDF. Please try again.');
    } finally {
      setPdfLoading(null);
    }
  };

  const handleDownloadInvoice = async (orderId: number) => {
    setInvoiceLoading(orderId);
    try {
      const res = await api.get(`/api/invoices/generate/${orderId}`, {
        responseType: 'text',
        headers: { Accept: 'text/html' },
      });
      setPreviewHtml(res.data as string);
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

  const handleStatusUpdate = async (orderId: number, newStatus: number, vendorId?: string) => {
    setUpdating(orderId);
    setUpdateError((prev) => ({ ...prev, [orderId]: '' }));
    try {
      await vendorOrdersApi.updateStatus(orderId, newStatus, undefined, vendorId);
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
    <div className="p-6 max-w-5xl bg-slate-200/60 rounded-3xl min-h-[calc(100vh-3rem)]">

      {/* Invoice preview modal — stays on this page, no new tab */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-3xl shadow-2xl" style={{ height: '85vh' }}>
            <button
              onClick={() => setPreviewHtml(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X size={15} className="text-slate-600" />
            </button>
            <iframe srcDoc={previewHtml} className="w-full h-full border-0" sandbox="allow-same-origin" title="Invoice Preview" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage and update your customer orders
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm flex items-center gap-2
                ${activeTab === tab.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900'}`}
            >
              {tab.label}
              <span className={`px-1.5 rounded text-xs ${activeTab === tab.value ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 rounded-full bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
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
          <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
            <ShoppingBag size={30} className="text-green-500" />
          </div>
          <p className="text-sm font-medium text-slate-600">No orders found</p>
          <p className="text-xs text-slate-500 mt-1">
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
                className="bg-white rounded-2xl shadow-md overflow-hidden"
              >
                {/* Order row */}
                <div className="flex items-center gap-4 px-5 py-4">

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-lg bg-emerald-50 flex-shrink-0 flex items-center justify-center">
                    <ShoppingBag size={22} className="text-emerald-500" />
                  </div>

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{order.orderNumber}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
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
                        onChange={(e) => handleStatusUpdate(order.id, Number(e.target.value), order.vendorId)}
                        className="text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded-full transition-colors"
                    >
                      {invoiceLoading === order.id
                        ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                        : <><FileText size={12} /> Invoice</>}
                    </button>

                    {/* Download PDF */}
                    <button
                      onClick={() => handleDownloadPdf(order.id, order.orderNumber)}
                      disabled={pdfLoading === order.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold rounded-full transition-colors"
                    >
                      {pdfLoading === order.id
                        ? <><Loader2 size={12} className="animate-spin" /> Downloading…</>
                        : <><Download size={12} /> Download</>}
                    </button>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : order.id)}
                      className="p-2 rounded-full text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
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
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Customer Contact</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                          {order.customerEmail && <span>{order.customerEmail}</span>}
                          {order.customerPhone && <span>{order.customerPhone}</span>}
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Items</p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 font-medium">{item.productName}</span>
                          <div className="flex items-center gap-4 text-slate-600 text-xs">
                            <span>Qty: {item.quantity}</span>
                            <span>@ {formatPrice(item.unitPrice)}</span>
                            <span className="font-semibold text-slate-700">{formatPrice(item.totalPrice)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Price breakdown */}
                    <div className="mt-4 pt-3 border-t border-gray-200 space-y-1 text-xs text-slate-600">
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
        <div className="mt-6 bg-white shadow-md rounded-2xl px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">
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
