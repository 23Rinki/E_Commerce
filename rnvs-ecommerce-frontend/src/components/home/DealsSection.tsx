'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Product } from '@/types';
import { getImageUrl } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { vendorProductsApi } from '@/lib/api';

// ─── Category display config ──────────────────────────────────────────────────

const CAT_META: Record<string, { color: string; emoji: string }> = {
  'Mobiles & Smartphones': { color: '#2563eb', emoji: '📱' },
  'Electronics':           { color: '#7c3aed', emoji: '💻' },
  'Home & Kitchen':        { color: '#059669', emoji: '🍳' },
  'Furniture & Decor':     { color: '#d97706', emoji: '🪑' },
  'Appliances':            { color: '#dc2626', emoji: '⚡' },
  'Sports & Fitness':      { color: '#ea580c', emoji: '⚽' },
  'Watches & Accessories': { color: '#0891b2', emoji: '⌚' },
  'Clothing & Apparel':    { color: '#db2777', emoji: '👗' },
  'Books & Stationery':    { color: '#7c3aed', emoji: '📚' },
  'Beauty & Personal Care':{ color: '#ec4899', emoji: '💄' },
  'Toys & Games':          { color: '#f59e0b', emoji: '🧸' },
  'Miscellaneous':         { color: '#64748b', emoji: '📦' },
};
const FALLBACK = { color: '#64748b', emoji: '🏷️' };

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  name, onConfirm, onCancel, loading,
}: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900 mb-1">Delete Product</h3>
        <p className="text-sm text-neutral-500 mb-5">
          Are you sure you want to delete <strong>&ldquo;{name}&rdquo;</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            {loading && <Loader2 size={13} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product, canManage, onDeleted,
}: { product: Product; canManage: boolean; onDeleted: (id: number) => void }) {
  const router   = useRouter();
  const img      = (product as any).primaryImageUrl ?? product.images?.[0]?.imageUrl ?? null;
  const mrp      = (product as any).basePrice ?? product.price;
  const selling  = product.discountPrice ?? product.price;
  const hasDisc  = selling < mrp;
  const discPct  = hasDisc ? Math.round((1 - selling / mrp) * 100) : 0;
  const reviewCount = ((product.id * 137 + 43) % 1980) + 20;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await vendorProductsApi.delete(product.id);
      setConfirmDelete(false);
      onDeleted(product.id);
    } catch { setDeleting(false); }
  };

  return (
    <>
      <Link href={`/products/${product.id}${(product as any).vendorId ? `?v=${encodeURIComponent((product as any).vendorId)}` : ''}`} className="block flex-shrink-0 w-44 group">
        <div className="bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all duration-200 h-full flex flex-col relative">

          {/* Image */}
          <div className="relative h-44 bg-white flex items-center justify-center overflow-hidden">
            <Image
              src={getImageUrl(img)}
              alt={product.name}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
              unoptimized
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
            />
            {hasDisc && (
              <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm leading-none">
                -{discPct}%
              </span>
            )}
            {(product as any)._sellerCount > 1 && (
              <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-sm leading-none">
                {(product as any)._sellerCount} sellers
              </span>
            )}
            {canManage && (
              <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/vendor/products?edit=${product.id}`); }}
                  className="w-7 h-7 bg-white shadow border border-neutral-200 rounded-full flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300">
                  <Pencil size={12} className="text-indigo-600" />
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true); }}
                  className="w-7 h-7 bg-white shadow border border-neutral-200 rounded-full flex items-center justify-center hover:bg-red-50 hover:border-red-300">
                  <Trash2 size={12} className="text-red-500" />
                </button>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="px-3 pt-2 pb-3 flex flex-col flex-1">
            <p className="text-[13px] text-neutral-800 line-clamp-2 leading-snug mb-2 flex-1">
              {product.name}
            </p>
            <div className="flex items-center gap-1 mb-1.5">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={10} className="text-amber-400 flex-shrink-0" fill="currentColor" />
              ))}
              <span className="text-[11px] text-blue-600 ml-0.5">({reviewCount})</span>
            </div>
            <div className="mb-2">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs text-neutral-700">₹</span>
                <span className="text-lg font-semibold text-neutral-900 leading-none tabular-nums">
                  {Math.floor(selling).toLocaleString('en-IN')}
                </span>
              </div>
              {hasDisc && (
                <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                  M.R.P.:{' '}
                  <span className="line-through">₹{Math.floor(mrp).toLocaleString('en-IN')}</span>
                  <span className="text-green-700 font-semibold ml-1">({discPct}% off)</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-neutral-900 text-xs font-semibold py-1.5 rounded-full transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </Link>

      {confirmDelete && (
        <DeleteConfirm
          name={product.name}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}
    </>
  );
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

function Carousel({
  title, categoryId, color, emoji, products, canManage, onDeleted,
}: {
  title: string;
  categoryId: number;
  color: string;
  emoji: string;
  products: Product[];
  canManage: boolean;
  onDeleted: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkArrows();
    const el = ref.current;
    el?.addEventListener('scroll', checkArrows, { passive: true });
    return () => el?.removeEventListener('scroll', checkArrows);
  }, [checkArrows, products]);

  const scroll = (dir: 'left' | 'right') =>
    ref.current?.scrollBy({ left: dir === 'left' ? -700 : 700, behavior: 'smooth' });

  if (!products.length) return null;

  return (
    <div className="bg-white shadow-sm" style={{ borderLeft: `4px solid ${color}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <h2 className="font-display tracking-tight text-lg text-neutral-900">{title}</h2>
        </div>
        <Link
          href={`/products?categoryId=${categoryId}`}
          className="text-sm font-semibold hover:underline transition-colors"
          style={{ color }}
        >
          See all →
        </Link>
      </div>

      {/* Products row */}
      <div className="relative px-1 py-4">
        {canLeft && (
          <button onClick={() => scroll('left')} aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-28 bg-white border border-neutral-200 shadow-md flex items-center justify-center hover:bg-neutral-50 transition-colors">
            <ChevronLeft size={22} className="text-neutral-700" />
          </button>
        )}
        <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} canManage={canManage} onDeleted={onDeleted} />
          ))}
        </div>
        {canRight && (
          <button onClick={() => scroll('right')} aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-28 bg-white border border-neutral-200 shadow-md flex items-center justify-center hover:bg-neutral-50 transition-colors">
            <ChevronRight size={22} className="text-neutral-700" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props { products: Product[]; }

export default function DealsSection({ products }: Props) {
  const { user } = useAuthStore();
  const role      = Number(user?.role);
  const canManage = role === 2 || role === 4 || role === 5;

  const [list, setList] = useState<Product[]>([]);
  useEffect(() => { setList(products); }, [products]);

  const handleDeleted = (id: number) =>
    setList((prev) => prev.filter((p) => p.id !== id));

  // Group products by category name
  const grouped = list.reduce<Record<string, { categoryId: number; products: Product[] }>>(
    (acc, p) => {
      const catName = (p as any).categoryName || 'Miscellaneous';
      const catId   = p.categoryId;
      if (!acc[catName]) acc[catName] = { categoryId: catId, products: [] };
      acc[catName].products.push(p);
      return acc;
    },
    {}
  );

  // Within each category deduplicate by product name — keep cheapest, note seller count
  const deduped = Object.fromEntries(
    Object.entries(grouped).map(([catName, { categoryId, products: catProds }]) => {
      const byName = catProds.reduce<Record<string, any>>((acc, p) => {
        const key = p.name.toLowerCase().trim();
        if (!acc[key]) {
          acc[key] = { ...p, _sellerCount: 1 };
        } else {
          const count = acc[key]._sellerCount + 1;
          // Keep the cheaper listing as primary
          acc[key] = p.price < acc[key].price
            ? { ...p, _sellerCount: count }
            : { ...acc[key], _sellerCount: count };
        }
        return acc;
      }, {});
      return [catName, { categoryId, products: Object.values(byName) }];
    })
  );

  // Sort categories: most products first
  const sorted = Object.entries(deduped).sort(
    ([, a], [, b]) => b.products.length - a.products.length
  );

  if (!sorted.length) return null;

  return (
    <section className="bg-[#f1f3f6] py-3">
      <div className="max-w-7xl mx-auto px-4 space-y-3">
        {canManage && (
          <p className="text-xs text-neutral-500 bg-white border border-neutral-200 px-3 py-1 rounded-full inline-block">
            Hover a product to edit or delete
          </p>
        )}
        {sorted.map(([catName, { categoryId, products: catProducts }]) => {
          const meta = CAT_META[catName] ?? FALLBACK;
          return (
            <Carousel
              key={catName}
              title={catName}
              categoryId={categoryId}
              color={meta.color}
              emoji={meta.emoji}
              products={catProducts}
              canManage={canManage}
              onDeleted={handleDeleted}
            />
          );
        })}
      </div>
    </section>
  );
}
