'use client';

import { useEffect, useState, useCallback } from 'react';
import { vendorProductsApi, inventoryApi } from '@/lib/api';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import { formatPrice } from '@/lib/utils';
import {
  BarChart2, Search, RefreshCw, Loader2, AlertCircle,
  PackageX, Edit2, Check, X, AlertTriangle,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface VendorProduct {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  categoryName?: string;
}

interface StockRecord {
  id: number;
  productId: number;
  currentQuantity: number;
  reservedQuantity: number;
  minimumThreshold: number;
  availableQuantity: number;
  lastUpdated: string;
}

interface InventoryRow {
  product: VendorProduct;
  stock: StockRecord | null;
}

interface EditForm {
  currentQuantity: string;
  minimumThreshold: string;
}

function apiError(err: any, fallback: string): string {
  if (!err?.response) return 'Cannot reach the server. Check your connection.';
  return err?.response?.data?.message || fallback;
}

function StatusBadge({ quantity, threshold }: { quantity: number; threshold: number }) {
  if (quantity === 0)
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Out of Stock</span>;
  if (quantity <= threshold)
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Low Stock</span>;
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">In Stock</span>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VendorInventoryPage() {
  const { designation } = useVendorStore();
  useVendorAccess('inventory', designation);

  const [rows, setRows]             = useState<InventoryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [activeTab, setActiveTab]   = useState<'all' | 'low' | 'out'>('all');
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editForm, setEditForm]     = useState<EditForm>({ currentQuantity: '', minimumThreshold: '' });
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, sRes] = await Promise.allSettled([
        vendorProductsApi.getAll(),
        inventoryApi.getAll(),
      ]);

      const products: VendorProduct[] = pRes.status === 'fulfilled'
        ? (pRes.value.data?.data?.items ?? pRes.value.data?.data ?? pRes.value.data ?? [])
        : [];

      const stocks: StockRecord[] = sRes.status === 'fulfilled'
        ? (sRes.value.data?.data ?? sRes.value.data ?? [])
        : [];

      const stockMap = new Map(stocks.map((s) => [s.productId, s]));

      setRows(products.map((p) => ({
        product: p,
        stock: stockMap.get(p.id) ?? null,
      })));
    } catch (err: any) {
      setError(apiError(err, 'Failed to load inventory.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalProducts = rows.length;
  const outOfStock    = rows.filter((r) => (r.stock?.currentQuantity ?? r.product.stockQuantity) === 0).length;
  const lowStock      = rows.filter((r) => {
    const qty = r.stock?.currentQuantity ?? r.product.stockQuantity;
    const min = r.stock?.minimumThreshold ?? 10;
    return qty > 0 && qty <= min;
  }).length;

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = rows.filter((r) => {
    const qty = r.stock?.currentQuantity ?? r.product.stockQuantity;
    const min = r.stock?.minimumThreshold ?? 10;

    const matchesSearch = search.trim() === '' ||
      r.product.name.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      activeTab === 'all' ? true :
      activeTab === 'out' ? qty === 0 :
      activeTab === 'low' ? qty > 0 && qty <= min : true;

    return matchesSearch && matchesTab;
  });

  // ── Edit handlers ─────────────────────────────────────────────────────────

  const startEdit = (row: InventoryRow) => {
    const qty = row.stock?.currentQuantity ?? row.product.stockQuantity;
    const min = row.stock?.minimumThreshold ?? 10;
    setEditingId(row.product.id);
    setEditForm({ currentQuantity: String(qty), minimumThreshold: String(min) });
    setSaveError('');
  };

  const cancelEdit = () => { setEditingId(null); setSaveError(''); };

  const saveEdit = async (row: InventoryRow) => {
    const qty = parseInt(editForm.currentQuantity);
    const min = parseInt(editForm.minimumThreshold);

    if (isNaN(qty) || qty < 0) { setSaveError('Stock quantity must be 0 or more.'); return; }
    if (isNaN(min) || min < 0) { setSaveError('Minimum threshold must be 0 or more.'); return; }

    setSaving(true);
    setSaveError('');

    try {
      if (row.stock) {
        await inventoryApi.update(row.stock.id, {
          currentQuantity: qty,
          reservedQuantity: row.stock.reservedQuantity,
          minimumThreshold: min,
        });
      } else {
        await inventoryApi.create({
          productId: row.product.id,
          currentQuantity: qty,
          reservedQuantity: 0,
          minimumThreshold: min,
        });
      }

      setRows((prev) => prev.map((r) =>
        r.product.id === row.product.id
          ? {
              ...r,
              stock: {
                id: r.stock?.id ?? 0,
                productId: row.product.id,
                currentQuantity: qty,
                reservedQuantity: r.stock?.reservedQuantity ?? 0,
                minimumThreshold: min,
                availableQuantity: qty - (r.stock?.reservedQuantity ?? 0),
                lastUpdated: new Date().toISOString(),
              },
            }
          : r
      ));
      setEditingId(null);
    } catch (err: any) {
      setSaveError(apiError(err, 'Failed to save. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage stock levels across your products</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-slate-800 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Products', value: totalProducts, color: 'bg-slate-100 text-slate-700' },
            { label: 'Low Stock',      value: lowStock,      color: 'bg-yellow-100 text-yellow-700' },
            { label: 'Out of Stock',   value: outOfStock,    color: 'bg-red-100 text-red-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className={`text-2xl font-black ${color.split(' ')[1]}`}>{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Low stock alert banner */}
      {!loading && lowStock > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5 text-sm text-yellow-800">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span><strong>{lowStock} product{lowStock > 1 ? 's are' : ' is'} running low on stock.</strong> Update quantities before they run out.</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {[
          { key: 'all', label: 'All',          count: totalProducts },
          { key: 'low', label: 'Low Stock',    count: lowStock },
          { key: 'out', label: 'Out of Stock', count: outOfStock },
        ].map((tab) => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
              ${activeTab === tab.key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-slate-700'}`}>
            {tab.label}
            <span className={`ml-1.5 ${activeTab === tab.key ? 'text-slate-300' : 'text-gray-400'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by product name..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-200" />
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
          <PackageX size={36} className="text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-400">No products found</p>
          <p className="text-xs text-gray-300 mt-1">
            {search ? 'Try a different name' : 'Add products first to manage inventory'}
          </p>
        </div>
      )}

      {/* Inventory list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
            <span>Product</span>
            <span className="w-24 text-center">Stock</span>
            <span className="w-24 text-center">Reserved</span>
            <span className="w-24 text-center">Min. Alert</span>
            <span className="w-24 text-center">Status</span>
            <span className="w-16 text-center">Edit</span>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.map((row) => {
              const qty      = row.stock?.currentQuantity ?? row.product.stockQuantity;
              const reserved = row.stock?.reservedQuantity ?? 0;
              const minThreshold = row.stock?.minimumThreshold ?? 10;
              const isEditing = editingId === row.product.id;

              return (
                <div key={row.product.id}
                  className={`grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 sm:gap-4 px-5 py-4 items-center
                    ${qty === 0 ? 'bg-red-50/30' : qty <= minThreshold ? 'bg-yellow-50/30' : ''}`}>

                  {/* Product info */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{row.product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatPrice(row.product.price)}</p>
                  </div>

                  {/* Current stock */}
                  <div className="w-24 text-center">
                    {isEditing ? (
                      <input type="number" min={0}
                        value={editForm.currentQuantity}
                        onChange={(e) => setEditForm((f) => ({ ...f, currentQuantity: e.target.value }))}
                        className="w-20 text-center text-sm border border-orange-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                    ) : (
                      <span className={`text-sm font-bold ${qty === 0 ? 'text-red-600' : qty <= minThreshold ? 'text-yellow-600' : 'text-slate-700'}`}>
                        {qty}
                      </span>
                    )}
                  </div>

                  {/* Reserved */}
                  <div className="w-24 text-center">
                    <span className="text-sm text-gray-500">{reserved}</span>
                  </div>

                  {/* Min threshold */}
                  <div className="w-24 text-center">
                    {isEditing ? (
                      <input type="number" min={0}
                        value={editForm.minimumThreshold}
                        onChange={(e) => setEditForm((f) => ({ ...f, minimumThreshold: e.target.value }))}
                        className="w-20 text-center text-sm border border-orange-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                    ) : (
                      <span className="text-sm text-gray-500">{minThreshold}</span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="w-24 text-center">
                    <StatusBadge quantity={qty} threshold={minThreshold} />
                  </div>

                  {/* Edit / Save / Cancel */}
                  <div className="w-16 flex items-center justify-center gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(row)} disabled={saving}
                          className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50">
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(row)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-gray-100 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Save error — spans full width */}
                  {isEditing && saveError && (
                    <div className="col-span-full text-xs text-red-500 mt-1">{saveError}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
