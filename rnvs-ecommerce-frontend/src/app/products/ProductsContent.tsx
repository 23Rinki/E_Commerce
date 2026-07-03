'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/product/ProductCard';
import CategorySidebar from '@/components/shared/CategorySidebar';
import { productsApi } from '@/lib/api';
import { loadCategories, getCachedCategories } from '@/lib/categoriesCache';
import { Product, Category } from '@/types';
import { Search, SlidersHorizontal, X, ChevronDown, Zap } from 'lucide-react';
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

function toProduct(r: SearchResult): Product {
  return {
    id: Number(r.productId ?? r.id) || 0,
    name: r.title,
    description: r.description,
    price: r.price,
    categoryId: Number(r.category) || 0,
    images: r.imageUrl ? [{ id: 0, imageUrl: r.imageUrl, isPrimary: true }] : [],
  };
}

export default function ProductsContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(getCachedCategories());
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
          sortBy:   debouncedFilters.sortBy,
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
  };

  const selectedCatName = filters.category;
  const activeFilterCount = [filters.minPrice, filters.maxPrice, filters.search].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Two-column layout: sidebar + main content */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Category sidebar (desktop) / chips (mobile) */}
        <CategorySidebar
          categories={categories}
          selectedId={filters.category}
          onSelect={(name) => { setFilters((f) => ({ ...f, category: name })); setPage(1); }}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">

          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl font-black text-slate-900">
                {debouncedFilters.search
                  ? `Results for "${debouncedFilters.search}"`
                  : selectedCatName || 'All Products'}
              </h1>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {totalCount > 0 && (
                  <p className="text-sm text-gray-500">{totalCount} products</p>
                )}
                {filters.search && searchTimeTaken !== null && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    <Zap size={10} /> D&amp;C ranked · {searchTimeTaken}ms
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Search box */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
                  placeholder="Search products…"
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 w-40 sm:w-52"
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={`${filters.sortBy}|${filters.sortDesc}`}
                  onChange={(e) => {
                    const [sortBy, sortDescStr] = e.target.value.split('|');
                    setFilters((f) => ({ ...f, sortBy, sortDesc: sortDescStr === 'true' }));
                    setPage(1);
                  }}
                  className="pl-3 pr-7 py-2 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer"
                >
                  <option value="createdAt|true">Newest</option>
                  <option value="price|false">Price ↑</option>
                  <option value="price|true">Price ↓</option>
                  <option value="name|false">A–Z</option>
                  {filters.search && <option value="relevance|false">Relevant</option>}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Price filter toggle */}
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${filterOpen ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-700 border-gray-200 hover:border-orange-400'}`}
              >
                <SlidersHorizontal size={14} />
                Filter
                {activeFilterCount > 0 && (
                  <span className={`text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center ${filterOpen ? 'bg-white text-orange-500' : 'bg-orange-500 text-white'}`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Price filter panel */}
          {filterOpen && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Min Price (₹)</label>
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => { setFilters((f) => ({ ...f, minPrice: e.target.value })); setPage(1); }}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Max Price (₹)</label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => { setFilters((f) => ({ ...f, maxPrice: e.target.value })); setPage(1); }}
                    placeholder="Any"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="mt-3 flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium">
                  <X size={13} /> Clear filters
                </button>
              )}
            </div>
          )}

          {/* Products grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-72 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-40 hover:border-orange-400 transition-colors">
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors
                          ${p === page ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:border-orange-400'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-40 hover:border-orange-400 transition-colors">
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">Try a different category or clear filters</p>
              <button onClick={clearFilters} className="bg-orange-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
