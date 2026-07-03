'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import HeroBanner      from '@/components/home/HeroBanner';
import TrustSection    from '@/components/home/TrustSection';
import CategorySidebar from '@/components/shared/CategorySidebar';
import { loadCategories, getCachedCategories } from '@/lib/categoriesCache';
import { productsApi } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { clearCategories } from '@/lib/categoriesCache';
import { Category, Product } from '@/types';
import { getImageUrl, formatPrice } from '@/lib/utils';
import { Eye } from 'lucide-react';
import ProductQuickView from '@/components/product/ProductQuickView';
import dynamic from 'next/dynamic';

const PromoSection      = dynamic(() => import('@/components/home/PromoSection'));
const NewsletterSection = dynamic(() => import('@/components/home/NewsletterSection'));

// ── Compact product card for the home page grid ─────────────────────────────

function HomeProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [showQV, setShowQV] = useState(false);

  const img     = (product as any).primaryImageUrl ?? product.images?.[0]?.imageUrl ?? null;
  const selling = product.discountPrice ?? product.price;
  const hasDisc = product.discountPrice && product.discountPrice < product.price;
  const discPct = hasDisc ? Math.round((1 - selling / product.price) * 100) : 0;

  const qvProduct = {
    id: Number(product.id),
    name: product.name,
    price: product.price,
    discountPrice: product.discountPrice,
    primaryImageUrl: img,
    images: product.images,
    stockQuantity: (product as any).stockQuantity,
    categoryName: (product as any).categoryName,
    shortDescription: (product as any).shortDescription,
    vendorName: (product as any).vendorName,
    vendorId: (product as any).vendorId,
  };

  return (
    <>
      {showQV && <ProductQuickView product={qvProduct} onClose={() => setShowQV(false)} />}

      <div className="group relative bg-white border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden h-full flex flex-col cursor-pointer">
        {/* Image area — click opens product detail in new tab */}
        <div
          className="relative bg-white flex items-center justify-center overflow-hidden"
          style={{ paddingTop: '100%' }}
          onClick={() => window.open(`/products/${product.id}${(product as any).vendorId ? `?v=${encodeURIComponent((product as any).vendorId)}` : ''}`, '_blank')}
        >
          <Image
            src={getImageUrl(img)}
            alt={product.name}
            fill
            unoptimized
            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
          />
          {hasDisc && discPct > 0 && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm leading-none z-10">
              -{discPct}%
            </span>
          )}
          {/* Quick View hover overlay */}
          <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setShowQV(true); }}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-semibold py-2 transition-colors"
            >
              <Eye size={12} />
              Quick View
            </button>
          </div>
        </div>

        {/* Text — click navigates to full detail */}
        <Link href={`/products/${product.id}${(product as any).vendorId ? `?v=${encodeURIComponent((product as any).vendorId)}` : ''}`} target="_blank" rel="noopener noreferrer" className="px-3 pt-2 pb-3 flex flex-col flex-1">
          <p className="text-[13px] text-slate-800 line-clamp-2 leading-snug mb-auto">{product.name}</p>
          <div className="mt-2">
            <span className="text-base font-bold text-slate-900">{formatPrice(selling)}</span>
            {hasDisc && (
              <span className="text-xs text-gray-400 line-through ml-1.5">{formatPrice(product.price)}</span>
            )}
          </div>
        </Link>
      </div>
    </>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-pulse">
      <div className="bg-gray-100" style={{ paddingTop: '100%' }} />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2 mt-1" />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

// Extracts the vendor ID embedded in a search result's composite id ("<vendorId>_<productId>")
function searchResultToProduct(r: any): Product {
  const composite: string = r.id ?? '';
  const underscoreIdx = composite.indexOf('_');
  const vendorId = underscoreIdx > -1 ? composite.slice(0, underscoreIdx) : '';
  return {
    id: Number(r.productId ?? composite) || 0,
    name: r.title,
    description: r.description,
    price: r.price,
    categoryId: Number(r.category) || 0,
    images: r.imageUrl ? [{ id: 0, imageUrl: r.imageUrl, isPrimary: true }] : [],
    vendorId,
  } as any;
}

export default function HomePage() {
  const { isAuthenticated, initAuth } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories]      = useState<Category[]>(getCachedCategories());
  const [products,   setProducts]        = useState<Product[]>([]);
  const [loading,    setLoading]         = useState(true);
  const [totalCount, setTotalCount]      = useState(0);
  const [selectedCategory, setSelected] = useState(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery]   = useState(searchParams.get('search') || '');
  const { searchNoResultsFor, setSearchNoResults } = useUIStore();

  // Verify token on every mount (needed after login redirect and for stale sessions)
  useEffect(() => { initAuth(); }, []);

  // Re-fetch categories whenever auth state changes (login, logout, or page mount)
  useEffect(() => {
    clearCategories();
    loadCategories().then(setCategories).catch(() => {});
  }, [isAuthenticated]);

  // Keep category/search state in sync with the URL (navbar links, browser back/forward, etc.)
  useEffect(() => {
    setSelected(searchParams.get('category') || '');
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const fetchProducts = useCallback(() => {
    setLoading(true);

    if (searchQuery.trim()) {
      const params: Record<string, unknown> = { page: 1, pageSize: 40, sortBy: 'relevance' };
      if (selectedCategory) params.category = selectedCategory;
      productsApi
        .search(searchQuery.trim(), params)
        .then((r) => {
          const results: any[] = r.data?.data ?? [];
          setProducts(results.map(searchResultToProduct));
          setTotalCount(r.data?.totalCount ?? results.length);
        })
        .catch(() => { setProducts([]); setTotalCount(0); })
        .finally(() => setLoading(false));
      return;
    }

    const params: Record<string, unknown> = { pageSize: 40, pageNumber: 1 };
    if (selectedCategory) params.category = selectedCategory;
    productsApi
      .getAll(params)
      .then((r) => {
        const raw   = r.data?.data ?? r.data ?? {};
        const items: Product[] = raw?.items ?? (Array.isArray(raw) ? raw : []);
        const seen = new Set<number>();
        const deduped = items.filter(p => seen.has(p.id) ? false : (seen.add(p.id), true));
        setProducts(deduped);
        setTotalCount(raw?.totalCount ?? deduped.length);
      })
      .catch(() => { setProducts([]); setTotalCount(0); })
      .finally(() => setLoading(false));
  }, [selectedCategory, searchQuery, isAuthenticated]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const selectCategory = (name: string) => {
    setSearchNoResults(null);
    router.push(name ? `/?category=${encodeURIComponent(name)}` : '/');
  };

  const selectedCatName = selectedCategory;

  return (
    <div className="bg-[#f1f3f6] min-h-screen">
      <HeroBanner />

      {searchNoResultsFor && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800">
              No products found for{' '}
              <span className="font-bold">&ldquo;{searchNoResultsFor}&rdquo;</span>.{' '}
              Browse our products below.
            </p>
            <button
              onClick={() => setSearchNoResults(null)}
              className="flex-shrink-0 p-1 rounded hover:bg-amber-100 transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} className="text-amber-600" />
            </button>
          </div>
        </div>
      )}

      <TrustSection />

      {/* ── Main content: sidebar + products ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Sidebar (desktop) / chips (mobile) */}
          <CategorySidebar
            categories={categories}
            selectedId={selectedCategory}
            onSelect={selectCategory}
          />

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {/* Section heading */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : (selectedCatName || 'Featured Products')}
              </h2>
              {searchQuery && (
                <span className="text-sm text-gray-500">{totalCount} products</span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((p) => <HomeProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-500 text-sm">No products in this category yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PromoSection />
      <NewsletterSection />
    </div>
  );
}
