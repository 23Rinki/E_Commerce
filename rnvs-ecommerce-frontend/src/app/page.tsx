'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import HeroBanner       from '@/components/home/HeroBanner';
import TrustSection     from '@/components/home/TrustSection';
import CategoryCarousel from '@/components/home/CategoryCarousel';
import ProductCard, { ProductCardSkeleton } from '@/components/product/ProductCard';
import { loadCategories, clearCategories } from '@/lib/categoriesCache';
import { productsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Category, Product } from '@/types';

const PromoSection      = dynamic(() => import('@/components/home/PromoSection'));
const Testimonials      = dynamic(() => import('@/components/home/Testimonials'));
const NewsletterSection = dynamic(() => import('@/components/home/NewsletterSection'));

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

  const [categories, setCategories] = useState<Category[]>([]); // start empty so server and client render the same markup
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);

  // Search and category browsing live on /products — forward old /?search= and /?category= links there
  useEffect(() => {
    if (searchParams.get('search') || searchParams.get('category')) {
      router.replace(`/products?${searchParams.toString()}`);
    }
  }, [searchParams, router]);

  // Verify token on every mount (needed after login redirect and for stale sessions)
  useEffect(() => { initAuth(); }, []);

  // Re-fetch categories whenever auth state changes (login, logout, or page mount)
  useEffect(() => {
    clearCategories();
    loadCategories().then(setCategories).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    setLoading(true);
    productsApi
      .getAll({ pageSize: 10, pageNumber: 1 })
      .then((r) => {
        const raw = r.data?.data ?? r.data ?? {};
        const items: Product[] = raw?.items ?? (Array.isArray(raw) ? raw : []);
        const seen = new Set<number>();
        setProducts(items.filter(p => seen.has(p.id) ? false : (seen.add(p.id), true)));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const selectCategory = (name: string) =>
    router.push(name ? `/products?category=${encodeURIComponent(name)}` : '/products');

  return (
    <div className="bg-white min-h-screen">
      <HeroBanner />
      <TrustSection />
      <CategoryCarousel categories={categories} onSelect={selectCategory} />

      {/* ── Featured products ─────────────────────────────────────────────── */}
      <section className="py-12 lg:py-16 bg-neutral-50/60">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">The Edit</div>
              <h2 className="font-display text-3xl lg:text-4xl mt-2 tracking-tight text-neutral-900">Featured Products</h2>
            </div>
            <Link href="/products" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-950 transition-colors">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-neutral-100">
              <p className="text-neutral-500 text-sm">No products yet — check back soon.</p>
            </div>
          )}

          {products.length > 0 && (
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
