'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Heart, Plus, Star, Eye, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import HeroBanner       from '@/components/home/HeroBanner';
import TrustSection     from '@/components/home/TrustSection';
import CategoryCarousel from '@/components/home/CategoryCarousel';
import { loadCategories, getCachedCategories } from '@/lib/categoriesCache';
import { productsApi, cartApi, wishlistApi } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { clearCategories } from '@/lib/categoriesCache';
import { Category, Product } from '@/types';
import { getImageUrl, formatPrice } from '@/lib/utils';
import ProductQuickView from '@/components/product/ProductQuickView';
import dynamic from 'next/dynamic';

const PromoSection      = dynamic(() => import('@/components/home/PromoSection'));
const Testimonials      = dynamic(() => import('@/components/home/Testimonials'));
const NewsletterSection = dynamic(() => import('@/components/home/NewsletterSection'));

// ── Product card for the home page grid ─────────────────────────────────────

function HomeProductCard({ product }: { product: Product }) {
  const { incrementCount } = useCartStore();
  const [showQV, setShowQV]                   = useState(false);
  const [adding, setAdding]                   = useState(false);
  const [wishlisted, setWishlisted]           = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const wishlistItemId = useRef<number | null>(null);

  const img     = (product as any).primaryImageUrl ?? product.images?.[0]?.imageUrl ?? null;
  const selling = product.discountPrice ?? product.price;
  const hasDisc = product.discountPrice && product.discountPrice < product.price;
  const discPct = hasDisc ? Math.round((1 - selling / product.price) * 100) : 0;
  const href = `/products/${product.id}${(product as any).vendorId ? `?v=${encodeURIComponent((product as any).vendorId)}` : ''}`;

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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    incrementCount();
    try {
      await cartApi.add({ productId: Number(product.id), quantity: 1, vendorId: (product as any).vendorId });
    } catch {
      incrementCount(-1);
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistLoading) return;
    setWishlistLoading(true);
    try {
      if (!wishlisted) {
        const res = await wishlistApi.add(Number(product.id));
        const added = res.data?.data || res.data;
        if (added?.id) wishlistItemId.current = added.id;
        setWishlisted(true);
      } else {
        let itemId = wishlistItemId.current;
        if (!itemId) {
          const res = await wishlistApi.get();
          const items: Array<{ id: number; productId: number }> = res.data?.data || res.data || [];
          itemId = items.find((i) => i.productId === Number(product.id))?.id ?? null;
        }
        if (itemId) {
          await wishlistApi.remove(itemId);
          wishlistItemId.current = null;
          setWishlisted(false);
        }
      }
    } catch {
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <article className="group relative">
      {showQV && <ProductQuickView product={qvProduct} onClose={() => setShowQV(false)} />}

      <Link href={href} target="_blank" rel="noopener noreferrer">
        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-100">
          <Image
            src={getImageUrl(img)}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain p-3 transition-transform duration-700 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
          />

          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {hasDisc && discPct > 0 && (
              <span className="text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-red-600 text-white">−{discPct}%</span>
            )}
          </div>

          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            className={`absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full backdrop-blur bg-white/85 border border-neutral-100 transition-all duration-300 disabled:opacity-60 ${wishlisted ? 'text-red-500' : 'text-neutral-700 hover:text-red-500'} opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0`}
            aria-label="Add to wishlist"
          >
            <Heart className={`h-4 w-4 ${wishlisted ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQV(true); }}
            className="absolute inset-x-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1.5 bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-semibold py-2"
          >
            <Eye size={12} /> Quick View
          </button>

          <div className="absolute inset-x-3 bottom-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="w-full h-11 rounded-full bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 transition inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> {adding ? 'Adding…' : 'Add to Bag'}
            </button>
          </div>
        </div>

        <div className="pt-4 px-1">
          {product.averageRating !== undefined && product.averageRating > 0 && (
            <div className="flex items-center gap-1 mb-1">
              <Star className="h-3.5 w-3.5 fill-neutral-900 text-neutral-900" />
              <span className="text-xs font-medium text-neutral-700">{product.averageRating.toFixed(1)}</span>
              <span className="text-xs text-neutral-400">({product.reviewCount ?? 0})</span>
            </div>
          )}
          <h3 className="text-[15px] font-medium text-neutral-900 leading-snug line-clamp-2">{product.name}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-semibold text-neutral-900">{formatPrice(selling)}</span>
            {hasDisc && <span className="text-sm text-neutral-400 line-through">{formatPrice(product.price)}</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden animate-pulse">
      <div className="bg-neutral-100 aspect-[4/5]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-neutral-100 rounded w-full" />
        <div className="h-3 bg-neutral-100 rounded w-3/4" />
        <div className="h-4 bg-neutral-100 rounded w-1/2 mt-1" />
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
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
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
    <div className="bg-white min-h-screen">
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

      <CategoryCarousel categories={categories} onSelect={selectCategory} />

      {/* ── Featured products ─────────────────────────────────────────────── */}
      <section className="py-12 lg:py-16 bg-neutral-50/60">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">The Edit</div>
              <h2 className="font-display text-3xl lg:text-4xl mt-2 tracking-tight text-neutral-900">
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : (selectedCatName || 'Featured Products')}
              </h2>
              {(searchQuery || selectedCatName) && (
                <Link href="/" className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-neutral-900 mt-2 transition-colors">
                  ← Back to all products
                </Link>
              )}
            </div>
            {searchQuery && <span className="text-sm text-neutral-500">{totalCount} products</span>}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {products.map((p) => <HomeProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-neutral-100">
              <p className="text-neutral-500 text-sm">No products in this category yet.</p>
            </div>
          )}

          {!searchQuery && !selectedCatName && products.length > 0 && (
            <div className="mt-10 flex justify-center">
              <Link
                href="/products"
                className="inline-flex items-center rounded-full h-12 px-8 border border-neutral-300 text-sm font-medium hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
              >
                View all products <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <PromoSection />
      <Testimonials />
      <NewsletterSection />
    </div>
  );
}
