'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Search, Heart, Menu, X,
  LogOut, User, ChevronRight, ChevronDown, Store, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { cartApi, productsApi } from '@/lib/api';
import { loadCategories, getCachedCategories } from '@/lib/categoriesCache';
import { getImageUrl, formatPrice } from '@/lib/utils';
import { Category } from '@/types';

interface SearchSuggestion {
  id: string;
  vendorId: string;
  vendorName: string;
  title: string;
  imageUrl: string;
  price: number;
  category: string;
}

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, logout, initAuth } = useAuthStore();
  const { itemCount, setCart } = useCartStore();
  const { setSearchNoResults } = useUIStore();
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<Category[]>(getCachedCategories());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { initAuth(); }, [initAuth]);

  useEffect(() => {
    loadCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      cartApi.get().then((r) => setCart(r.data?.data || r.data)).catch(() => {});
    }
  }, [isAuthenticated, isInitialized]);

  // Fetch suggestions as user types
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await productsApi.search(value.trim(), { pageSize: 6 });
        const results: any[] = res.data?.data ?? [];
        const seen = new Set<string>();
        const items: SearchSuggestion[] = [];
        for (const r of results) {
          if (!r.title || seen.has(r.title)) continue;
          seen.add(r.title);
          const composite: string = r.id ?? '';
          const underscoreIdx = composite.indexOf('_');
          const vendorId = underscoreIdx > -1 ? composite.slice(0, underscoreIdx) : '';
          items.push({ id: r.productId ?? '', vendorId, vendorName: r.vendorName ?? '', title: r.title, imageUrl: r.imageUrl ?? '', price: r.price ?? 0, category: r.category ?? '' });
          if (items.length === 6) break;
        }
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch { setSuggestions([]); setShowSuggestions(false); }
    }, 250);
  };

  // Close suggestions when clicking outside the search box
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    setShowSuggestions(false);
    setSuggestions([]);
    setSearching(true);
    setSearchNoResults(null);
    try {
      const res = await productsApi.search(q, { pageSize: 1 });
      const total = res.data?.totalCount ?? (Array.isArray(res.data?.data) ? res.data.data.length : 0);
      if (total > 0) {
        router.push(`/?search=${encodeURIComponent(q)}`);
      } else {
        setSearchNoResults(q);
        router.push('/');
      }
    } catch {
      router.push(`/?search=${encodeURIComponent(q)}`);
    } finally {
      setSearching(false);
    }
  };

  const pickSuggestion = (s: SearchSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    window.open(`/products/${s.id}${s.vendorId ? `?v=${encodeURIComponent(s.vendorId)}` : ''}`, '_blank');
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const role = Number(user?.role);
  const topCategories = categories.slice(0, 5);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-100">
      {/* ── Row 1: Logo + search ── */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-6 h-16">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-full bg-neutral-900 grid place-items-center text-white font-display text-sm">R</div>
            <div className="font-display text-xl tracking-tight text-neutral-900 hidden sm:block">RNVS CommerceX</div>
          </Link>

          {/* Search */}
          <div ref={searchRef} className="relative flex flex-1 min-w-[160px]">
            <form onSubmit={handleSearch} className="flex w-full items-center gap-2 rounded-full border border-neutral-400 bg-neutral-50 pl-4 pr-1.5 py-1.5 focus-within:border-neutral-600 focus-within:bg-white transition-colors">
              <Search className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Search products, brands and more..."
                className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder:text-neutral-500"
              />
              <button
                type="submit"
                disabled={searching}
                className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-900 hover:bg-neutral-800 grid place-items-center transition-colors disabled:opacity-60"
              >
                {searching
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Search size={14} className="text-white" />}
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-20px_rgba(0,0,0,0.15)] border border-neutral-100 rounded-2xl z-50 overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={`${s.vendorId}_${s.id}`}
                    type="button"
                    onMouseDown={() => pickSuggestion(s)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <div className="w-11 h-11 flex-shrink-0 bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100">
                      <img
                        src={getImageUrl(s.imageUrl)}
                        alt={s.title}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-900 truncate font-medium">{s.title}</p>
                      {s.vendorName && (
                        <p className="text-[11px] text-neutral-500 truncate">Sold by {s.vendorName}</p>
                      )}
                      {s.category && (
                        <p className="text-[11px] text-neutral-400 truncate">{s.category}</p>
                      )}
                    </div>
                    {s.price > 0 && (
                      <span className="flex-shrink-0 text-sm font-semibold text-neutral-900">
                        {formatPrice(s.price)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile toggle (row 1, mobile only) */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden h-10 w-10 grid place-items-center rounded-full hover:bg-neutral-100 transition-colors flex-shrink-0">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Row 2: Category nav + account/wishlist/cart ── */}
      <div className="hidden xl:block border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">

            {/* Nav links (desktop) */}
            <nav className="flex items-center gap-1 flex-shrink-0">
              <Link href="/" className="px-3 py-2 text-sm font-medium text-neutral-800 hover:text-neutral-950 transition-colors whitespace-nowrap">
                Home
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setCatMenuOpen(true)}
                onMouseLeave={() => setCatMenuOpen(false)}
              >
                <button className="px-3 py-2 text-sm font-medium text-neutral-800 hover:text-neutral-950 inline-flex items-center gap-1.5 transition-colors">
                  <Menu size={15} /> All Categories
                </button>
                {catMenuOpen && (
                  <div className="absolute left-0 top-full pt-2">
                    <div className="bg-white border border-neutral-100 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-20px_rgba(0,0,0,0.15)] overflow-hidden w-64 max-h-[70vh] overflow-y-auto">
                      {categories.map((cat) => (
                        <Link key={cat.id} href={`/?category=${encodeURIComponent(cat.name)}`}
                          className="flex items-center justify-between px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-colors">
                          {cat.name} <ChevronRight size={13} className="text-neutral-300" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {topCategories.map((cat) => (
                <Link key={cat.id} href={`/?category=${encodeURIComponent(cat.name)}`}
                  className="px-3 py-2 text-sm font-medium text-neutral-800 hover:text-neutral-950 transition-colors whitespace-nowrap">
                  {cat.name}
                </Link>
              ))}

              {(!role || role === 1) && (
                <Link href="/sell" className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors whitespace-nowrap">
                  Sell on RNVS
                </Link>
              )}
            </nav>

            {/* Right section */}
            <div className="flex items-center gap-1 flex-shrink-0">

              {/* Account dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="h-10 pl-2 pr-3 inline-flex items-center gap-1.5 rounded-full hover:bg-neutral-100 transition text-sm font-medium"
              >
                <span className="h-7 w-7 grid place-items-center rounded-full bg-neutral-100">
                  <User className="h-4 w-4 text-neutral-800" />
                </span>
                <span className="hidden sm:inline text-neutral-800">
                  {isAuthenticated ? user?.firstName : 'Sign In'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-neutral-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-20px_rgba(0,0,0,0.15)] border border-neutral-100 z-50 overflow-hidden rounded-2xl"
                  style={{ width: isAuthenticated ? '340px' : '288px' }}>

                  {isAuthenticated ? (
                    <div className="flex">
                      {/* Left */}
                      <div className="flex-1 border-r border-neutral-100 py-3">
                        <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Your Account</p>

                        {(role === 4 || role === 5) && (
                          <Link href="/admin/vendors" onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-1.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors">
                            Admin Panel
                          </Link>
                        )}
                        {role === 2 && (
                          <Link href="/vendor/dashboard" onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-1.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors">
                            Seller Dashboard
                          </Link>
                        )}

                        {[
                          { href: '/account', label: 'Your Account' },
                          { href: '/account/orders', label: 'Your Orders' },
                          { href: '/account/wishlist', label: 'Your Wish List' },
                        ].map(({ href, label }) => (
                          <Link key={label} href={href} onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                            {label}
                          </Link>
                        ))}

                        <div className="border-t border-neutral-100 mt-2 pt-2">
                          <button onClick={handleLogout}
                            className="flex items-center gap-2 w-full text-left px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                            <LogOut size={13} /> Sign Out
                          </button>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex-1 py-3">
                        <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Your Lists</p>
                        {[
                          { href: '/account/wishlist', label: 'Wish List' },
                          { href: '/account/orders', label: 'Recent Orders' },
                          { href: '/cart', label: 'Your Cart' },
                        ].map(({ href, label }) => (
                          <Link key={label} href={href} onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                            {label}
                          </Link>
                        ))}

                        {role === 1 && (
                          <div className="border-t border-neutral-100 mt-2 pt-2">
                            <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Sell</p>
                            <Link href="/sell" onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                              Register as a Seller
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5">
                      {/* Big Sign In pill */}
                      <Link
                        href="/auth/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="block w-full h-11 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium grid place-items-center transition-colors"
                      >
                        Sign In
                      </Link>

                      {/* Create account */}
                      <div className="mt-3 px-3 pb-3 text-center text-sm text-neutral-600 border-b border-neutral-100">
                        New customer?{' '}
                        <Link href="/auth/register" onClick={() => setUserMenuOpen(false)}
                          className="font-semibold text-neutral-900 hover:underline">
                          Create account
                        </Link>
                      </div>

                      {/* SELL section */}
                      <div className="mt-2 px-3">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Sell</div>
                        <Link
                          href="/sell"
                          onClick={() => setUserMenuOpen(false)}
                          className="mt-2 flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-neutral-50 transition group -mx-1"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-9 w-9 rounded-full bg-neutral-900 text-white grid place-items-center flex-shrink-0">
                              <Store className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="text-sm font-medium text-neutral-900">Register as a Seller</div>
                              <div className="text-xs text-neutral-500">Start selling on RNVS — it&apos;s free</div>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:translate-x-0.5 group-hover:text-neutral-900 transition flex-shrink-0" />
                        </Link>
                      </div>

                      {/* Quick links */}
                      <div className="mt-1 grid grid-cols-3 border-t border-neutral-100 pt-2">
                        {[
                          { label: 'Orders',   href: '/account/orders' },
                          { label: 'Wishlist', href: '/account/wishlist' },
                          { label: 'Help',     href: '#' },
                        ].map((x) => (
                          <Link
                            key={x.label}
                            href={x.href}
                            onClick={() => setUserMenuOpen(false)}
                            className="text-center text-xs py-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                          >
                            {x.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link href="/account/wishlist"
              className="hidden sm:grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100 transition-colors relative">
              <Heart className="h-5 w-5 text-neutral-800" />
            </Link>

            {/* Cart */}
            <Link href="/cart"
              className="h-10 px-3 inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden md:inline">Cart</span>
              <span className="grid place-items-center h-5 min-w-5 px-1 rounded-full bg-white text-neutral-900 text-[11px] font-semibold">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="xl:hidden bg-white border-t border-neutral-100 shadow-lg">
          <div className="px-4 py-4">
            <form onSubmit={handleSearch} className="mb-4 flex items-center gap-2 rounded-full border border-neutral-400 bg-neutral-50 pl-4 pr-1.5 py-1.5">
              <Search className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              <input type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder:text-neutral-500"
              />
              <button type="submit" className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-900 hover:bg-neutral-800 grid place-items-center transition-colors">
                <Search size={14} className="text-white" />
              </button>
            </form>
            <div className="grid grid-cols-2 gap-1.5">
              <Link href="/"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-neutral-700 hover:text-neutral-950 py-2 px-3 rounded-full hover:bg-neutral-50 transition-colors font-medium">
                Home
              </Link>
              {categories.slice(0, 8).map((cat) => (
                <Link key={cat.id} href={`/?category=${encodeURIComponent(cat.name)}`}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-neutral-700 hover:text-neutral-950 py-2 px-3 rounded-full hover:bg-neutral-50 transition-colors font-medium">
                  {cat.name}
                </Link>
              ))}
            </div>
            {!isAuthenticated && (
              <div className="mt-4 flex gap-2">
                <Link href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold rounded-full text-center transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 py-2.5 border border-neutral-300 text-neutral-800 text-sm font-semibold rounded-full text-center hover:bg-neutral-50 transition-colors">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
