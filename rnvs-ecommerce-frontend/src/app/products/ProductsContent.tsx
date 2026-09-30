'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard, { ProductCardSkeleton } from '@/components/product/ProductCard';
import CategorySidebar from '@/components/shared/CategorySidebar';
import { productsApi } from '@/lib/api';
import { loadCategories } from '@/lib/categoriesCache';
import { Product, Category } from '@/types';
import { SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { clearCategories } from '@/lib/categoriesCache';

interface SearchResult {
  id: string;
  productId?: string;
  title: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  url: string;
  score: number;
  highlights: string[];
}

// Search ids are composite ("<vendorId>_<productId>"); keep the vendor so product links resolve
function toProduct(r: SearchResult): Product {
  const us = r.id ? r.id.indexOf('_') : -1;
  return {
    id: Number(r.productId ?? r.id) || 0,
    name: r.title,
    description: r.description,
    price: r.price,
    categoryId: Number(r.category) || 0,
    images: r.imageUrl ? [{ id: 0, imageUrl: r.imageUrl, isPrimary: true }] : [],
    vendorId: us > -1 ? r.id.slice(0, us) : '',
    categoryName: r.category,
  } as Product;
}

export default function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // start empty so server and client render the same markup
  const [loading, setLoading]     = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]           = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    search:   searchParams.get('search')   || '',
    category: searchParams.get('category') || '',
    minPrice: '',
    maxPrice: '',
    sortBy:   'createdAt',
    sortDesc: true,
  });

  const pageSize = 12;

  // Re-fetch categories when auth state changes so vendor/guest sees correct categories
  useEffect(() => {
    clearCategories();
    loadCategories().then(setCategories).catch(() => {});
  }, [isAuthenticated]);

  // Sync search and category from URL params whenever the URL changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlCat = searchParams.get('category') || '';
    setFilters(f => ({
      ...f,
      search: urlSearch,
      category: urlCat,
      // Searches default to relevance; plain browsing defaults to newest
      sortBy: urlSearch ? 'relevance' : (f.sortBy === 'relevance' ? 'createdAt' : f.sortBy),
      sortDesc: urlSearch ? false : f.sortDesc,
    }));
    setPage(1);
  }, [searchParams]);

  // Debounce filters
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedFilters(filters), 400);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [filters]);

  const [searchTimeTaken, setSearchTimeTaken] = useState<number | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setSearchTimeTaken(null);
    try {
      if (debouncedFilters.search.trim()) {
        const params: Record<string, unknown> = {
          page,
          pageSize,
          sortBy: debouncedFilters.sortBy === 'createdAt' ? 'relevance' : debouncedFilters.sortBy,
        };
        if (debouncedFilters.category) params.category = debouncedFilters.category;
        if (debouncedFilters.minPrice) params.minPrice = debouncedFilters.minPrice;
        if (debouncedFilters.maxPrice) params.maxPrice = debouncedFilters.maxPrice;

        const res = await productsApi.search(debouncedFilters.search.trim(), params);
        const data = res.data;
        const results: SearchResult[] = data?.data || [];
        setProducts(results.map(toProduct));
        setTotalCount(data?.totalCount || 0);
        setSearchTimeTaken(data?.timeTakenMs ?? null);
      } else {
        const params: Record<string, unknown> = {
          pageNumber: page,
          pageSize,
          sortBy:   debouncedFilters.sortBy === 'relevance' ? 'createdAt' : debouncedFilters.sortBy,
          sortDesc: debouncedFilters.sortDesc,
        };
        if (debouncedFilters.category) params.category = debouncedFilters.category;
        if (debouncedFilters.minPrice) params.minPrice = debouncedFilters.minPrice;
        if (debouncedFilters.maxPrice) params.maxPrice = debouncedFilters.maxPrice;

        const res = await productsApi.getAll(params);
        const payload = res.data?.data || res.data;
        const raw: Product[] = payload?.items || [];
        const seen = new Set<number>();
        setProducts(raw.filter(p => seen.has(p.id) ? false : (seen.add(p.id), true)));
        setTotalCount(payload?.totalCount || 0);
      }
    } catch {
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const clearFilters = () => {
    setFilters({ search: '', category: '', minPrice: '', maxPrice: '', sortBy: 'createdAt', sortDesc: true });
    setSearchTimeTaken(null);
    setPage(1);
    router.replace('/products');
  };

  const selectCategory = (name: string) => {
    setFilters((f) => ({ ...f, category: name }));
    setPage(1);
  };

  const clearSearch = () => {
    setFilters((f) => ({ ...f, search: '' }));
    router.replace(filters.category ? `/products?category=${encodeURIComponent(filters.category)}` : '/products');
  };

  const selectedCatName = filters.category;
  const priceFilterCount = [filters.minPrice, filters.maxPrice].filter(Boolean).length;
  const hasAnyFilter = !!(filters.search || filters.category || priceFilterCount);

  const title = debouncedFilters.search
    ? <>Results for <span className="italic">&ldquo;{debouncedFilters.search}&rdquo;</span></>
    : selectedCatName || 'All Products';
  const eyebrow = debouncedFilters.search ? 'Search' : selectedCatName ? 'Category' : 'Shop';

  const inputCls = 'w-full h-11 px-4 rounded-full border border-neutral-200 bg-white text-sm outline-none focus:border-neutral-900 transition-colors';
  const chipCls  = 'inline-flex items-center gap-1.5 h-9 pl-3.5 pr-2.5 rounded-full border border-neutral-300 text-neutral-800 text-xs font-medium hover:border-neutral-900 transition-colors';
  const pagerBtn = 'h-10 w-10 grid place-items-center rounded-full border border-neutral-200 transition-colors enabled:hover:bg-neutral-900 enabled:hover:text-white enabled:hover:border-neutral-900 disabled:opacity-40';

  return (
    <div className="bg-white">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <section className="border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 py-10 lg:py-14">
          <nav className="text-xs text-neutral-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-neutral-900 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-neutral-900">{debouncedFilters.search ? 'Search' : selectedCatName || 'Products'}</span>
          </nav>
          <div className="mt-5 text-xs uppercase tracking-[0.3em] text-neutral-500">{eyebrow}</div>
          <h1 className="font-display text-4xl lg:text-5xl mt-2 tracking-tight text-neutral-900 break-words">{title}</h1>
          <p className="mt-3 text-sm text-neutral-500">
            {loading
              ? 'Loading products…'
              : `${totalCount} ${totalCount === 1 ? 'product' : 'products'}${searchTimeTaken !== null && debouncedFilters.search ? ` · found in ${searchTimeTaken} ms` : ''}`}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Category sidebar (desktop) / chips (mobile) */}
          <CategorySidebar categories={categories} selectedId={filters.category} onSelect={selectCategory} />

          {/* Main content */}
          <div className="flex-1 min-w-0 w-full">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              {/* Active filter chips */}
              <div className="flex flex-wrap items-center gap-2 min-h-9">
                {filters.search && (
                  <button onClick={clearSearch} className="inline-flex items-center gap-1.5 h-9 pl-3.5 pr-2.5 rounded-full bg-neutral-900 text-white text-xs font-medium">
                    <Search className="h-3.5 w-3.5" /> {filters.search} <X className="h-3.5 w-3.5 opacity-70" />
                  </button>
                )}
                {filters.category && (
                  <button onClick={() => selectCategory('')} className={chipCls}>
                    {filters.category} <X className="h-3.5 w-3.5 opacity-60" />
                  </button>
                )}
                {priceFilterCount > 0 && (
                  <button onClick={() => { setFilters((f) => ({ ...f, minPrice: '', maxPrice: '' })); setPage(1); }} className={chipCls}>
                    ₹{filters.minPrice || '0'} – {filters.maxPrice ? `₹${filters.maxPrice}` : 'any'} <X className="h-3.5 w-3.5 opacity-60" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Sort */}
                <div className="relative">
                  <select
                    value={`${filters.sortBy}|${filters.sortDesc}`}
                    onChange={(e) => {
                      const [sortBy, sortDescStr] = e.target.value.split('|');
                      setFilters((f) => ({ ...f, sortBy, sortDesc: sortDescStr === 'true' }));
                      setPage(1);
                    }}
                    aria-label="Sort products"
                    className="h-10 pl-4 pr-9 rounded-full border border-neutral-200 text-sm text-neutral-800 bg-white outline-none focus:border-neutral-900 appearance-none cursor-pointer hover:border-neutral-400 transition-colors"
                  >
                    {filters.search && <option value="relevance|false">Most relevant</option>}
                    <option value="createdAt|true">Newest</option>
                    <option value="price|false">Price: low to high</option>
                    <option value="price|true">Price: high to low</option>
                    <option value="name|false">Name: A–Z</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>

                {/* Price filter toggle */}
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`h-10 inline-flex items-center gap-2 px-4 rounded-full border text-sm font-medium transition-colors
                    ${filterOpen ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400'}`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Price
                  {priceFilterCount > 0 && (
                    <span className={`text-[11px] font-semibold h-5 min-w-5 px-1 rounded-full grid place-items-center ${filterOpen ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'}`}>
                      {priceFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Price filter panel */}
            {filterOpen && (
              <div className="rounded-3xl border border-neutral-100 bg-neutral-50/60 p-5 mb-6">
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <label className="block">
                    <span className="block text-[11px] uppercase tracking-widest text-neutral-500 mb-2">Min price (₹)</span>
                    <input type="number" min={0} value={filters.minPrice} placeholder="0" className={inputCls}
                      onChange={(e) => { setFilters((f) => ({ ...f, minPrice: e.target.value })); setPage(1); }} />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] uppercase tracking-widest text-neutral-500 mb-2">Max price (₹)</span>
                    <input type="number" min={0} value={filters.maxPrice} placeholder="Any" className={inputCls}
                      onChange={(e) => { setFilters((f) => ({ ...f, maxPrice: e.target.value })); setPage(1); }} />
                  </label>
                </div>
              </div>
            )}

            {/* Products grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                  {products.map((p) => <ProductCard key={`${(p as any).vendorId ?? ''}_${p.id}`} product={p} />)}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className={pagerBtn}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`h-10 min-w-10 px-3 rounded-full text-sm font-medium transition-colors
                            ${p === page ? 'bg-neutral-900 text-white' : 'border border-neutral-200 text-neutral-700 hover:border-neutral-900'}`}>
                          {p}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className={pagerBtn}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 px-6 rounded-3xl border border-neutral-100 bg-neutral-50/60">
                <div className="mx-auto h-14 w-14 rounded-full bg-white border border-neutral-100 grid place-items-center">
                  <Search className="h-6 w-6 text-neutral-400" />
                </div>
                <h3 className="font-display text-2xl text-neutral-900 mt-5">
                  {debouncedFilters.search ? <>Nothing found for &ldquo;{debouncedFilters.search}&rdquo;</> : 'No products here yet'}
                </h3>
                <p className="text-sm text-neutral-500 mt-2 max-w-sm mx-auto">
                  {debouncedFilters.search
                    ? 'Try a different spelling, a more general word, or browse a category instead.'
                    : 'Try another category or widen your price range.'}
                </p>
                {hasAnyFilter && (
                  <button onClick={clearFilters}
                    className="mt-6 inline-flex items-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 h-11 px-6 text-sm font-medium transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
