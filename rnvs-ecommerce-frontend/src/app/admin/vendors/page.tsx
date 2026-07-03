'use client';

import { useEffect, useState, useCallback } from 'react';
import { platformAdminApi } from '@/lib/api';
import {
  Users, Activity, Database, AlertCircle, CheckCircle,
  Clock, Search, X, ChevronDown, StickyNote, RefreshCw,
  Loader2, ToggleLeft, ToggleRight, Shield, Zap,
  ShoppingBag, Package, TrendingUp, DollarSign, ChevronLeft, ChevronRight as ChevronRightIcon,
  Trash2, UserX, Send, Copy, CheckCheck,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id: number;
  vendorId: string;
  vendorName?: string;
  storeName: string;
  contactEmail: string;
  contactPhone?: string;
  plan: string;
  status: string;
  hasDedicatedDb: boolean;
  railwayServiceId?: string;
  subscriptionStartDate: string;
  subscriptionEndDate?: string;
  lastActivityAt?: string;
  daysSinceLastActivity?: number;
  hasMaintenanceNotes: boolean;
  createdAt: string;
}

interface TenantDetail extends Tenant {
  railwayDatabaseUrl?: string;
  storagePrefix: string;
  maintenanceNotes?: string;
  updatedAt: string;
}

interface VendorOverview {
  totalOrders: number;
  recentOrders: number;
  totalRevenue: number;
  recentRevenue: number;
  totalProducts: number;
  activeProducts: number;
  totalCustomers: number;
  pendingOrders: number;
}

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface VendorOrder {
  id: number;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: number;
  statusName: string;
  createdAt: string;
  items: OrderItem[];
}

interface VendorProduct {
  id: number;
  name: string;
  price: number;
  isActive: boolean;
  stockQuantity: number;
  createdAt: string;
  imageUrl?: string;
}

interface RemovedVendor {
  id: number;
  storeName: string;
  vendorName: string;
  contactEmail: string;
  contactPhone?: string;
  plan: string;
  status: string;
  joinedAt: string;
  removedAt: string;
}

interface Stats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  basicPlan: number;
  proPlan: number;
  enterprisePlan: number;
  withDedicatedDb: number;
  activeLast7Days: number;
  inactive30Days: number;
  pendingMaintenance: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Active:    'bg-green-100 text-green-700',
  Trial:     'bg-blue-100 text-blue-700',
  Suspended: 'bg-red-100 text-red-600',
  Cancelled: 'bg-gray-100 text-gray-500',
};

const PLAN_STYLE: Record<string, string> = {
  Basic:      'bg-gray-100 text-gray-600',
  Pro:        'bg-orange-100 text-orange-600',
  Enterprise: 'bg-purple-100 text-purple-700',
};

function activityBadge(days?: number) {
  if (days === undefined || days === null) return { label: 'Never', cls: 'text-slate-600 font-medium' };
  if (days === 0) return { label: 'Today', cls: 'text-green-700 font-bold' };
  if (days <= 7) return { label: `${days}d ago`, cls: 'text-green-700 font-semibold' };
  if (days <= 30) return { label: `${days}d ago`, cls: 'text-yellow-700 font-semibold' };
  return { label: `${days}d ago`, cls: 'text-red-600 font-bold' };
}

function isExpiringSoon(endDate?: string) {
  if (!endDate) return false;
  const diff = (new Date(endDate).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 7;
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function TenantDetailPanel({ tenant, onClose, onRefresh }: {
  tenant: Tenant; onClose: () => void; onRefresh: () => void;
}) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [railwayUrl, setRailwayUrl] = useState('');
  const [railwayId, setRailwayId] = useState('');
  const [savingRailway, setSavingRailway] = useState(false);
  const [tab, setTab] = useState<'overview' | 'orders' | 'products' | 'info' | 'notes' | 'railway'>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Payment link
  const [payAmount, setPayAmount] = useState(2999);
  const [payDesc, setPayDesc] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [payLinkResult, setPayLinkResult] = useState<{ link: string; whatsapp: string } | null>(null);
  const [payLinkError, setPayLinkError] = useState('');
  const [copied, setCopied] = useState<'link' | 'wa' | null>(null);

  // Cross-tenant data
  const [overview, setOverview] = useState<VendorOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsPage, setProductsPage] = useState(1);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    platformAdminApi.getTenant(tenant.id)
      .then((r) => {
        const d: TenantDetail = r.data?.data || r.data;
        setDetail(d);
        setRailwayUrl(d.railwayDatabaseUrl || '');
        setRailwayId(d.railwayServiceId || '');
      })
      .catch(() => {});
  }, [tenant.id]);

  // Load overview when tab selected
  useEffect(() => {
    if (tab !== 'overview' || overview) return;
    setOverviewLoading(true);
    platformAdminApi.getOverview(tenant.id)
      .then((r) => setOverview(r.data?.data || r.data))
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  }, [tab, tenant.id, overview]);

  // Load orders when tab selected or page changes
  useEffect(() => {
    if (tab !== 'orders') return;
    setOrdersLoading(true);
    platformAdminApi.getOrders(tenant.id, ordersPage)
      .then((r) => {
        const d = r.data?.data || r.data;
        setOrders(d.items || []);
        setOrdersTotal(d.totalCount || 0);
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [tab, tenant.id, ordersPage]);

  // Load products when tab selected or page changes
  useEffect(() => {
    if (tab !== 'products') return;
    setProductsLoading(true);
    platformAdminApi.getProducts(tenant.id, productsPage)
      .then((r) => {
        const d = r.data?.data || r.data;
        setProducts(d.items || []);
        setProductsTotal(d.totalCount || 0);
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, [tab, tenant.id, productsPage]);

  const handleStatusToggle = async () => {
    if (!detail) return;
    const next = detail.status === 'Active' ? 'Suspended' : 'Active';
    setUpdatingStatus(true);
    try {
      await platformAdminApi.updateStatus(detail.id, next);
      setDetail((d) => d ? { ...d, status: next } : d);
      onRefresh();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim() || !detail) return;
    setSavingNote(true);
    try {
      await platformAdminApi.addNote(detail.id, note.trim());
      // Reload detail to get updated notes
      const r = await platformAdminApi.getTenant(detail.id);
      setDetail(r.data?.data || r.data);
      setNote('');
      onRefresh();
    } finally {
      setSavingNote(false);
    }
  };

  const handleSendPayLink = async () => {
    if (!detail) return;
    setSendingLink(true);
    setPayLinkError('');
    setPayLinkResult(null);
    try {
      const res = await fetch('/api/admin/send-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorEmail: detail.contactEmail,
          vendorName: detail.vendorName || detail.storeName,
          storeName: detail.storeName,
          amount: payAmount,
          description: payDesc.trim() || 'Monthly subscription',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayLinkResult({ link: data.paymentLink, whatsapp: data.whatsappText });
        // Auto-log to maintenance notes
        const desc = payDesc.trim() || 'Monthly subscription';
        await platformAdminApi.addNote(detail.id, `Payment link sent — ₹${payAmount.toLocaleString('en-IN')} (${desc}) — ${data.paymentLink}`);
        const r = await platformAdminApi.getTenant(detail.id);
        setDetail(r.data?.data || r.data);
        onRefresh();
      } else {
        setPayLinkError(data.error || 'Failed to create payment link');
      }
    } catch {
      setPayLinkError('Failed to send payment link. Check Razorpay credentials.');
    } finally {
      setSendingLink(false);
    }
  };

  const copyToClipboard = (text: string, type: 'link' | 'wa') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleSaveRailway = async () => {
    if (!railwayUrl.trim() || !detail) return;
    setSavingRailway(true);
    try {
      await platformAdminApi.updateRailway(detail.id, { databaseUrl: railwayUrl, serviceId: railwayId || undefined });
      onRefresh();
    } finally {
      setSavingRailway(false);
    }
  };

  const handleDelete = async () => {
    if (!detail || deleteConfirm !== detail.storeName) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await platformAdminApi.deleteTenant(detail.id);
      onRefresh();
      onClose();
    } catch {
      setDeleteError('Failed to remove vendor. Please try again.');
      setDeleting(false);
    }
  };

  const act = activityBadge(detail?.daysSinceLastActivity);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{tenant.storeName}</h2>
              {tenant.vendorName && (
                <p className="text-xs text-slate-300 font-medium mt-0.5">{tenant.vendorName}</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">{tenant.contactEmail}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLE[tenant.status] || 'bg-gray-100 text-gray-500'}`}>
              {tenant.status}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PLAN_STYLE[tenant.plan] || 'bg-gray-100 text-gray-500'}`}>
              {tenant.plan}
            </span>
            {tenant.hasDedicatedDb && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-800 text-green-200 flex items-center gap-1">
                <Database size={10} /> Railway DB
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 flex items-center gap-1">
              <TrendingUp size={10} />
              {overview
                ? overview.totalRevenue > 0
                  ? `₹${overview.totalRevenue.toLocaleString()}`
                  : 'No sales yet'
                : '—'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'orders',   label: 'Orders' },
            { key: 'products', label: 'Products' },
            { key: 'info',     label: 'Info' },
            { key: 'notes',    label: detail?.maintenanceNotes ? '● Notes' : 'Notes' },
            { key: 'railway',  label: 'DB' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-colors
                ${tab === key ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!detail ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <>
              {/* Overview tab */}
              {tab === 'overview' && (
                overviewLoading || !overview ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={22} className="animate-spin text-gray-300" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Orders',    value: overview.totalOrders,    icon: ShoppingBag, color: 'bg-slate-800' },
                        { label: 'Recent (30d)',     value: overview.recentOrders,   icon: Activity,    color: 'bg-orange-500' },
                        { label: 'Total Revenue',   value: `₹${overview.totalRevenue.toLocaleString()}`,  icon: DollarSign, color: 'bg-green-500' },
                        { label: 'Revenue (30d)',   value: `₹${overview.recentRevenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-blue-500' },
                        { label: 'Total Products',  value: overview.totalProducts,  icon: Package,     color: 'bg-purple-500' },
                        { label: 'Active Products', value: overview.activeProducts, icon: CheckCircle, color: 'bg-teal-500' },
                        { label: 'Customers',       value: overview.totalCustomers, icon: Users,       color: 'bg-indigo-500' },
                        { label: 'Pending Orders',  value: overview.pendingOrders,  icon: Clock,       color: 'bg-yellow-500' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                            <Icon size={14} className="text-white" />
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-800">{value}</p>
                            <p className="text-xs text-gray-400">{label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Orders tab */}
              {tab === 'orders' && (
                ordersLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={22} className="animate-spin text-gray-300" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No orders yet.</p>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-3 mb-4">
                      {orders.map((o) => (
                        <div key={o.id} className="bg-gray-50 rounded-xl px-3 py-3 border border-gray-100">
                          {/* Order header */}
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">#{o.orderNumber}</p>
                              <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-800">₹{o.totalAmount.toLocaleString()}</p>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                o.statusName === 'Delivered' ? 'bg-green-100 text-green-700' :
                                o.statusName === 'Cancelled' ? 'bg-red-100 text-red-600' :
                                o.statusName === 'Shipped'   ? 'bg-blue-100 text-blue-600' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{o.statusName}</span>
                            </div>
                          </div>

                          {/* Customer */}
                          <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-gray-200">
                            <Users size={11} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-slate-700">{o.customerName}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400">{o.customerEmail}</span>
                          </div>

                          {/* Products */}
                          {o.items?.length > 0 && (
                            <div className="space-y-1">
                              {o.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-700 truncate flex-1 mr-2">
                                    <span className="text-gray-400">×{item.quantity}</span> {item.productName}
                                  </span>
                                  <span className="text-slate-600 font-medium flex-shrink-0">₹{item.totalPrice.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{ordersTotal} total</span>
                      <div className="flex items-center gap-2">
                        <button disabled={ordersPage === 1} onClick={() => setOrdersPage(p => p - 1)}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                          <ChevronLeft size={14} />
                        </button>
                        <span>Page {ordersPage}</span>
                        <button disabled={ordersPage * 20 >= ordersTotal} onClick={() => setOrdersPage(p => p + 1)}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                          <ChevronRightIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Products tab */}
              {tab === 'products' && (
                productsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={22} className="animate-spin text-gray-300" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Package size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No products yet.</p>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-2 mb-4">
                      {products.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">Stock: {p.stockQuantity}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-slate-800">₹{p.price.toLocaleString()}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {p.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{productsTotal} total</span>
                      <div className="flex items-center gap-2">
                        <button disabled={productsPage === 1} onClick={() => setProductsPage(p => p - 1)}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                          <ChevronLeft size={14} />
                        </button>
                        <span>Page {productsPage}</span>
                        <button disabled={productsPage * 20 >= productsTotal} onClick={() => setProductsPage(p => p + 1)}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                          <ChevronRightIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Info tab */}
              {tab === 'info' && (
                <div className="space-y-4">
                  {[
                    ['Vendor ID', detail.vendorId],
                    ['Phone', detail.contactPhone || '—'],
                    ['Plan', detail.plan],
                    ['Subscription Start', new Date(detail.subscriptionStartDate).toLocaleDateString()],
                    ['Subscription End', detail.subscriptionEndDate ? new Date(detail.subscriptionEndDate).toLocaleDateString() : 'Ongoing'],
                    ['Storage Prefix', detail.storagePrefix],
                    ['Last Activity', detail.lastActivityAt ? `${new Date(detail.lastActivityAt).toLocaleString()} (${detail.daysSinceLastActivity}d ago)` : 'Never'],
                    ['Joined', new Date(detail.createdAt).toLocaleDateString()],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-start gap-4 text-sm">
                      <span className="text-gray-400 font-medium shrink-0">{label}</span>
                      <span className="text-slate-800 text-right break-all">{value}</span>
                    </div>
                  ))}

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Account Status</p>
                        <p className="text-xs text-gray-400">
                          {detail.status === 'Active' ? 'Vendor store is live' : 'Access suspended'}
                        </p>
                      </div>
                      <button onClick={handleStatusToggle} disabled={updatingStatus} className="transition-colors disabled:opacity-50">
                        {updatingStatus
                          ? <Loader2 size={28} className="animate-spin text-gray-400" />
                          : detail.status === 'Active'
                            ? <ToggleRight size={34} className="text-orange-500" />
                            : <ToggleLeft size={34} className="text-gray-300" />}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-red-100 pt-4 mt-2">
                    <p className="text-sm font-bold text-red-600 mb-1">Remove Vendor</p>
                    <p className="text-xs text-gray-500 mb-3">
                      This permanently deletes the vendor account, bank details, and registration record. This cannot be undone.
                    </p>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Type store name to confirm
                    </label>
                    <input
                      value={deleteConfirm}
                      onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
                      placeholder={detail.storeName}
                      className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:outline-none focus:border-red-400 mb-2"
                    />
                    {deleteError && (
                      <p className="text-xs text-red-500 mb-2">{deleteError}</p>
                    )}
                    <button
                      onClick={handleDelete}
                      disabled={deleteConfirm !== detail.storeName || deleting}
                      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-200 disabled:text-red-400 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                    >
                      {deleting && <Loader2 size={14} className="animate-spin" />}
                      Remove Vendor Permanently
                    </button>
                  </div>
                </div>
              )}

              {/* Notes tab */}
              {tab === 'notes' && (
                <div className="space-y-4">

                  {/* Send Payment Link */}
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Send size={11} /> Send Payment Link
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Amount (₹)</label>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <input
                          type="text"
                          value={payDesc}
                          onChange={(e) => setPayDesc(e.target.value)}
                          placeholder="Month 2 subscription"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSendPayLink}
                      disabled={sendingLink || !payAmount}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
                    >
                      {sendingLink
                        ? <><Loader2 size={13} className="animate-spin" /> Sending...</>
                        : <><Send size={13} /> Send via Email + Log Note</>}
                    </button>
                    {payLinkError && (
                      <p className="text-xs text-red-600 mt-2">{payLinkError}</p>
                    )}
                    {payLinkResult && (
                      <div className="mt-3 space-y-2">
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Payment Link</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-blue-600 break-all flex-1">{payLinkResult.link}</p>
                            <button
                              onClick={() => copyToClipboard(payLinkResult.link, 'link')}
                              className="flex-shrink-0 text-gray-400 hover:text-orange-500 transition-colors"
                            >
                              {copied === 'link' ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(payLinkResult.whatsapp, 'wa')}
                          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
                        >
                          {copied === 'wa'
                            ? <><CheckCheck size={13} /> Copied!</>
                            : <><Copy size={13} /> Copy WhatsApp Message</>}
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Add Maintenance Note
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="e.g. Vendor reported image upload issue. Checked server — disk space was low. Cleared old logs. Resolved 2026-03-29."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 resize-none"
                    />
                    <button
                      onClick={handleSaveNote}
                      disabled={savingNote || !note.trim()}
                      className="mt-2 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      {savingNote && <Loader2 size={13} className="animate-spin" />}
                      Save Note
                    </button>
                  </div>

                  {detail.maintenanceNotes ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">History</p>
                      <pre className="text-sm text-slate-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed border border-gray-100">
                        {detail.maintenanceNotes}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <StickyNote size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No notes yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Railway tab */}
              {tab === 'railway' && (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${detail.hasDedicatedDb ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    <Database size={16} />
                    {detail.hasDedicatedDb
                      ? 'This vendor has a dedicated Railway PostgreSQL database.'
                      : 'Using shared database (Basic plan). Upgrade to Pro for dedicated DB.'}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Railway Database URL
                    </label>
                    <input
                      type="text"
                      value={railwayUrl}
                      onChange={(e) => setRailwayUrl(e.target.value)}
                      placeholder="postgresql://user:pass@host.railway.app:5432/railway"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Railway Service ID (optional)
                    </label>
                    <input
                      type="text"
                      value={railwayId}
                      onChange={(e) => setRailwayId(e.target.value)}
                      placeholder="railway-service-uuid"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 font-mono"
                    />
                  </div>
                  <button
                    onClick={handleSaveRailway}
                    disabled={savingRailway || !railwayUrl.trim()}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    {savingRailway && <Loader2 size={13} className="animate-spin" />}
                    Save Railway Config
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminVendorsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selected, setSelected] = useState<Tenant | null>(null);
  // undefined = not loaded yet, null = failed/no DB, number = revenue (0 = no sales)
  const [vendorRevenues, setVendorRevenues] = useState<Record<number, number | null>>({});
  // Remove vendor — inline confirmation
  const [removeTarget, setRemoveTarget] = useState<Tenant | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState('');
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  // Removed vendors history
  const [removedVendors, setRemovedVendors] = useState<RemovedVendor[]>([]);
  const [removedLoading, setRemovedLoading] = useState(false);
  const [selectedRemoved, setSelectedRemoved] = useState<RemovedVendor | null>(null);

  const exportToCsv = () => {
    const headers = ['Store Name', 'Vendor Name', 'Email', 'Phone', 'Plan', 'Status', 'Dedicated DB', 'Joined', 'Last Active', 'Subscription End'];
    const rows = tenants.map((t) => [
      t.storeName,
      t.vendorName || '',
      t.contactEmail,
      t.contactPhone || '',
      t.plan,
      t.status,
      t.hasDedicatedDb ? 'Yes' : 'No',
      new Date(t.createdAt).toLocaleDateString('en-IN'),
      t.lastActivityAt ? new Date(t.lastActivityAt).toLocaleDateString('en-IN') : 'Never',
      t.subscriptionEndDate ? new Date(t.subscriptionEndDate).toLocaleDateString('en-IN') : 'Ongoing',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setVendorRevenues({});
    try {
      const [tRes, sRes] = await Promise.allSettled([
        platformAdminApi.getTenants({
          search: search || undefined,
          status: statusFilter || undefined,
          plan: planFilter || undefined,
        }),
        platformAdminApi.getStats(),
      ]);
      if (tRes.status === 'fulfilled') {
        const tenantList: Tenant[] = tRes.value.data?.data || tRes.value.data || [];
        setTenants(tenantList);
        // Fetch total revenue for each vendor in parallel (background)
        Promise.allSettled(
          tenantList.map(async (t) => {
            try {
              const r = await platformAdminApi.getOverview(t.id);
              const d = r.data?.data || r.data;
              setVendorRevenues(prev => ({ ...prev, [t.id]: d?.totalRevenue ?? 0 }));
            } catch {
              setVendorRevenues(prev => ({ ...prev, [t.id]: null }));
            }
          })
        );
      }
      if (sRes.status === 'fulfilled') {
        setStats(sRes.value.data?.data || sRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter]);

  useEffect(() => { load(); }, [load]);

  const loadRemoved = useCallback(async () => {
    setRemovedLoading(true);
    try {
      const r = await platformAdminApi.getRemovedVendors();
      setRemovedVendors(r.data?.data || r.data || []);
    } catch {
      setRemovedVendors([]);
    } finally {
      setRemovedLoading(false);
    }
  }, []);

  useEffect(() => { loadRemoved(); }, [loadRemoved]);

  const handleRemove = async () => {
    if (!removeTarget || removeConfirm.trim() !== removeTarget.storeName.trim()) return;
    setRemoving(true);
    setRemoveError('');
    try {
      await platformAdminApi.deleteTenant(removeTarget.id);
      setRemoveTarget(null);
      setRemoveConfirm('');
      load();
      loadRemoved();
    } catch {
      setRemoveError('Failed to remove vendor. Please try again.');
      setRemoving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Vendor Registry</h1>
          <p className="text-sm text-gray-500 mt-0.5">All stores using your platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToCsv} disabled={tenants.length === 0}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors px-3 py-2 rounded-xl hover:bg-green-50 disabled:opacity-40">
            <Activity size={15} />
            Export CSV
          </button>
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors px-3 py-2 rounded-xl hover:bg-orange-50">
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Vendors', value: stats.total, icon: Users, color: 'text-slate-900' },
            { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Active (7d)', value: stats.activeLast7Days, icon: Activity, color: 'text-orange-500' },
            { label: 'Inactive (30d+)', value: stats.inactive30Days, icon: AlertCircle, color: 'text-red-500' },
            { label: 'Basic Plan', value: stats.basicPlan, icon: Shield, color: 'text-gray-500' },
            { label: 'Pro Plan', value: stats.proPlan, icon: Zap, color: 'text-orange-500' },
            { label: 'Dedicated DBs', value: stats.withDedicatedDb, icon: Database, color: 'text-blue-600' },
            { label: 'Pending Support', value: stats.pendingMaintenance, icon: StickyNote, color: 'text-yellow-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <p className="text-xs text-gray-400 font-medium">{label}</p>
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by store name or email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition-colors"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
        </div>

        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-7 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Suspended">Suspended</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
            className="pl-3 pr-7 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer">
            <option value="">All Plans</option>
            <option value="Basic">Basic</option>
            <option value="Pro">Pro</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-5 bg-gray-100 rounded-full w-16" />
                <div className="h-5 bg-gray-100 rounded-full w-12" />
              </div>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-16">
            <Users size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-slate-700 font-semibold">No vendors found</p>
            <p className="text-sm text-gray-400 mt-1">Vendors will appear here once they sign up.</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-gray-100 text-xs font-bold text-slate-600 uppercase tracking-wide">
              <span>Store</span>
              <span className="w-28 text-center">Status / Plan</span>
              <span className="w-24 text-center">DB</span>
              <span className="w-28 text-right">Total Sales</span>
              <span className="w-28 text-center">Last Active</span>
              <span className="w-16 text-center">Notes</span>
              <span className="w-12 text-center">Remove</span>
            </div>

            <div className="divide-y divide-gray-50">
              {tenants.map((t) => {
                const act = activityBadge(t.daysSinceLastActivity);
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`flex sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-3 px-5 py-4 cursor-pointer transition-colors
                      ${isExpiringSoon(t.subscriptionEndDate) ? 'bg-yellow-50/60 hover:bg-yellow-100/40' : 'hover:bg-orange-50/30'}`}
                  >
                    {/* Store */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 truncate">{t.storeName}</p>
                        {isExpiringSoon(t.subscriptionEndDate) && (
                          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-200 text-yellow-800">Expiring</span>
                        )}
                      </div>
                      {t.vendorName && (
                        <p className="text-xs font-semibold text-slate-700 truncate">{t.vendorName}</p>
                      )}
                      <p className="text-xs text-slate-500 truncate">{t.contactEmail}</p>
                    </div>

                    {/* Status + Plan */}
                    <div className="w-28 text-center space-y-1">
                      <div>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLE[t.status] || 'bg-gray-100 text-gray-500'}`}>
                          {t.status}
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLAN_STYLE[t.plan] || 'bg-gray-100 text-gray-500'}`}>
                          {t.plan}
                        </span>
                      </div>
                    </div>

                    {/* DB */}
                    <div className="w-24 flex flex-col items-center justify-center gap-0.5">
                      {t.hasDedicatedDb ? (
                        <>
                          <Database size={13} className="text-blue-500" />
                          <span className="text-[10px] font-bold text-blue-500">Railway</span>
                        </>
                      ) : (
                        <>
                          <Database size={13} className="text-slate-400" />
                          <span className="text-[10px] font-semibold text-slate-400">Local</span>
                        </>
                      )}
                    </div>

                    {/* Total Sales */}
                    <div className="w-28 text-right">
                      {!(t.id in vendorRevenues) ? (
                        <>
                          <p className="text-xs font-bold text-slate-700">—</p>
                          <p className="text-[10px] font-medium text-slate-500">Still loading</p>
                        </>
                      ) : vendorRevenues[t.id] === null ? (
                        <>
                          <p className="text-xs font-bold text-slate-700">N/A</p>
                          <p className="text-[10px] font-medium text-slate-500">DB unavailable</p>
                        </>
                      ) : vendorRevenues[t.id] === 0 ? (
                        <>
                          <p className="text-xs font-bold text-slate-700">No sales</p>
                          <p className="text-[10px] font-medium text-slate-500">No revenue yet</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-green-700">₹{vendorRevenues[t.id]!.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] font-medium text-slate-500">Total revenue</p>
                        </>
                      )}
                    </div>

                    {/* Last Active */}
                    <div className="w-28 text-center">
                      <span className={`text-xs ${act.cls}`}>{act.label}</span>
                    </div>

                    {/* Notes indicator */}
                    <div className="w-16 flex justify-center">
                      {t.hasMaintenanceNotes && (
                        <StickyNote size={15} className="text-yellow-500" />
                      )}
                    </div>

                    {/* Remove button */}
                    <div className="w-12 flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemoveTarget(t);
                          setRemoveConfirm(t.storeName);
                          setRemoveError('');
                        }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove vendor"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Removed Vendors Table */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <UserX size={16} className="text-slate-500" />
          <h2 className="text-base font-bold text-slate-800">Removed Vendors</h2>
          <span className="text-xs text-gray-400 font-medium">Vendors who left or were removed from the platform</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {removedLoading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : removedVendors.length === 0 ? (
            <div className="text-center py-10">
              <UserX size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No vendors have been removed yet.</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-3 border-b border-gray-100 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <span>Store / Vendor</span>
                <span className="w-24 text-center">Was Status</span>
                <span className="w-36 text-right">Joined</span>
                <span className="w-36 text-right">Removed On</span>
              </div>
              <div className="divide-y divide-gray-50">
                {removedVendors.map((r) => (
                  <div key={r.id}
                    onClick={() => setSelectedRemoved(r)}
                    className="flex sm:grid sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5 hover:bg-red-50/30 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate line-through decoration-red-300">{r.storeName}</p>
                      <p className="text-xs font-semibold text-slate-600 truncate">{r.vendorName}</p>
                      <p className="text-xs text-slate-400 truncate">{r.contactEmail}</p>
                    </div>
                    <div className="w-24 text-center">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {r.status}
                      </span>
                    </div>
                    <div className="w-36 text-right">
                      <p className="text-xs text-slate-600">{new Date(r.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="w-36 text-right">
                      <p className="text-xs font-semibold text-red-600">{new Date(r.removedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Remove Confirmation Modal */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Remove Vendor</p>
                <p className="text-xs text-gray-400">This cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              This will permanently delete <span className="font-bold text-slate-900">{removeTarget.storeName}</span> and all associated account data. Their name will be saved in the removed vendors log below.
            </p>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Type store name to confirm
            </label>
            <input
              value={removeConfirm}
              onChange={(e) => { setRemoveConfirm(e.target.value); setRemoveError(''); }}
              placeholder={removeTarget.storeName}
              autoFocus
              autoComplete="off"
              className="w-full px-3 py-2.5 border border-red-200 rounded-xl text-sm focus:outline-none focus:border-red-400 mb-3"
            />

            {removeError && (
              <p className="text-xs text-red-500 mb-3">{removeError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setRemoveTarget(null); setRemoveConfirm(''); setRemoveError(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removeConfirm.trim() !== removeTarget.storeName.trim() || removing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-200 disabled:text-red-400 text-white text-sm font-bold transition-colors"
              >
                {removing && <Loader2 size={13} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <TenantDetailPanel
          tenant={selected}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}

      {/* Removed Vendor Detail Modal */}
      {selectedRemoved && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRemoved(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <UserX size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 line-through decoration-red-300">{selectedRemoved.storeName}</p>
                  <p className="text-xs text-gray-400">Removed vendor</p>
                </div>
              </div>
              <button onClick={() => setSelectedRemoved(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Vendor Name</span>
                <span className="text-slate-800 font-semibold">{selectedRemoved.vendorName || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="text-slate-800 font-semibold">{selectedRemoved.contactEmail}</span>
              </div>
              {selectedRemoved.contactPhone && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Phone</span>
                  <span className="text-slate-800 font-semibold">{selectedRemoved.contactPhone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Status at removal</span>
                <span className="text-slate-800 font-semibold">{selectedRemoved.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Joined</span>
                <span className="text-slate-800 font-semibold">{new Date(selectedRemoved.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-red-100 pt-3">
                <span className="text-red-500 font-medium">Removed On</span>
                <span className="text-red-600 font-bold">{new Date(selectedRemoved.removedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
