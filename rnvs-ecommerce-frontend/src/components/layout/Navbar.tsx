'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Search, Heart, Menu, X,
  ChevronDown, LogOut, User,
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
  const { openLoginModal, setSearchNoResults } = useUIStore();
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

  return (
    <header className="sticky top-0 z-50">

      {/* ── Top bar ── */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 h-12">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex flex-col items-start group">
              <span className="text-white font-black text-lg tracking-tight leading-none">RNVS</span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-gray-400 uppercase leading-none">CommerceX</span>
            </Link>

            {/* Search */}
            <div ref={searchRef} className="relative flex flex-1 min-w-0 max-w-2xl">
              <form onSubmit={handleSearch} className="flex w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Search products, brands and more..."
                  className="flex-1 min-w-0 px-4 py-2 text-sm text-slate-800 border-0 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-300 transition-colors bg-white"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="flex-shrink-0 px-5 bg-purple-400 hover:bg-purple-300 rounded-r-lg flex items-center justify-center transition-colors disabled:opacity-70"
                >
                  {searching
                    ? <span className="w-4 h-4 border-2 border-purple-900 border-t-transparent rounded-full animate-spin" />
                    : <Search size={16} className="text-purple-900" />}
                </button>
              </form>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-2xl border border-gray-200 rounded-b-xl z-50 overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.vendorId}_${s.id}`}
                      type="button"
                      onMouseDown={() => pickSuggestion(s)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-orange-50 transition-colors text-left"
                    >
                      {/* Thumbnail */}
                      <div className="w-11 h-11 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={getImageUrl(s.imageUrl)}
                          alt={s.title}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate font-medium">{s.title}</p>
                        {s.vendorName && (
                          <p className="text-[11px] text-gray-500 truncate">Sold by {s.vendorName}</p>
                        )}
                        {s.category && (
                          <p className="text-[11px] text-gray-400 truncate">{s.category}</p>
                        )}
                      </div>
                      {/* Price */}
                      {s.price > 0 && (
                        <span className="flex-shrink-0 text-sm font-bold text-slate-900">
                          {formatPrice(s.price)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1 ml-auto">

              {/* Account dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium text-white">
                  <User size={17} className="text-gray-400" />
                  <span className="hidden md:block">
                    {isAuthenticated ? user?.firstName : 'Sign In'}
                  </span>
                  <ChevronDown size={13} className="text-gray-400 hidden md:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white shadow-xl border border-gray-100 z-50 overflow-hidden rounded-xl"
                    style={{ width: isAuthenticated ? '340px' : '220px' }}>

                    {isAuthenticated ? (
                      <div className="flex">
                        {/* Left */}
                        <div className="flex-1 border-r border-gray-100 py-3">
                          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Your Account</p>

                          {(role === 4 || role === 5) && (
                            <Link href="/admin/vendors" onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
                              Admin Panel
                            </Link>
                          )}
                          {role === 2 && (
                            <Link href="/vendor/dashboard" onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
                              Seller Dashboard
                            </Link>
                          )}

                          {[
                            { href: '/account', label: 'Your Account' },
                            { href: '/account/orders', label: 'Your Orders' },
                            { href: '/account/wishlist', label: 'Your Wish List' },
                          ].map(({ href, label }) => (
                            <Link key={label} href={href} onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-1.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors">
                              {label}
                            </Link>
                          ))}

                          <div className="border-t border-gray-100 mt-2 pt-2">
                            <button onClick={handleLogout}
                              className="flex items-center gap-2 w-full text-left px-4 py-1.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors">
                              <LogOut size={13} /> Sign Out
                            </button>
                          </div>
                        </div>

                        {/* Right */}
                        <div className="flex-1 py-3">
                          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Your Lists</p>
                          {[
                            { href: '/account/wishlist', label: 'Wish List' },
                            { href: '/account/orders', label: 'Recent Orders' },
                            { href: '/cart', label: 'Your Cart' },
                          ].map(({ href, label }) => (
                            <Link key={label} href={href} onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-1.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors">
                              {label}
                            </Link>
                          ))}

                          {role === 1 && (
                            <div className="border-t border-gray-100 mt-2 pt-2">
                              <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sell</p>
                              <Link href="/sell" onClick={() => setUserMenuOpen(false)}
                                className="block px-4 py-1.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors">
                                Register as a Seller
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        <button
                          onClick={() => { setUserMenuOpen(false); openLoginModal(); }}
                          className="w-full text-sm font-bold py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                          Sign In
                        </button>
                        <p className="text-xs text-center text-gray-500">
                          New customer?{' '}
                          <button onClick={() => { setUserMenuOpen(false); openLoginModal('register'); }}
                            className="text-indigo-600 font-semibold hover:underline">
                            Create account
                          </button>
                        </p>
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sell</p>
                          <Link href="/sell" onClick={() => setUserMenuOpen(false)}
                            className="text-sm text-slate-600 hover:underline">
                            Register as a Seller
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Returns & Orders */}
              <Link href="/account/orders"
                className="hidden lg:flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                <span className="text-[10px] text-gray-400">Returns &</span>
                <span className="text-xs font-semibold text-white">Orders</span>
              </Link>

              {/* Wishlist */}
              <Link href="/account/wishlist"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-white">
                <Heart size={18} />
                <span className="hidden lg:block text-sm font-medium">Wishlist</span>
              </Link>

              {/* Cart */}
              <Link href="/cart"
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                <div className="relative">
                  <ShoppingCart size={20} className="text-white" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-purple-400 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </div>
                <span className="hidden md:block text-sm font-semibold text-white">Cart</span>
              </Link>

              {/* Mobile toggle */}
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-white rounded-lg hover:bg-gray-800 transition-colors">
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category bar (Amazon-style) ── */}
      <div className="bg-[#232f3e]">
        <div className="max-w-[1500px] mx-auto">
          <div className="flex items-center h-10 overflow-x-auto scrollbar-hide">

            {/* All — with dropdown */}
            <div
              className="relative flex-shrink-0 h-full"
              onMouseEnter={() => setCatMenuOpen(true)}
              onMouseLeave={() => setCatMenuOpen(false)}
            >
              <button className="flex items-center gap-1.5 text-white hover:bg-[#37475a] text-xs font-bold px-3 h-full whitespace-nowrap transition-colors border border-transparent hover:border-white/30">
                <Menu size={14} /> All
              </button>
              {catMenuOpen && (
                <div className="absolute top-full left-0 bg-white shadow-2xl w-64 py-1 z-50 border border-gray-200">
                  {categories.map((cat) => (
                    <Link key={cat.id} href={`/?category=${encodeURIComponent(cat.name)}`}
                      className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-[#232f3e] hover:text-white transition-colors">
                      {cat.name}
                    </Link>
                  ))}
                  <div className="border-t border-gray-200 mt-1 pt-1">
                    <Link href="/" className="flex items-center px-4 py-2 text-sm font-bold text-[#c45500] hover:bg-orange-50">
                      View All Products →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Home */}
            <Link href="/"
              className="flex-shrink-0 text-white hover:bg-[#37475a] text-xs font-semibold px-3 h-full flex items-center whitespace-nowrap transition-colors border border-transparent hover:border-white/30">
              Home
            </Link>

            {/* Today's Deals */}
            <Link href="/"
              className="flex-shrink-0 text-white hover:bg-[#37475a] text-xs font-semibold px-3 h-full flex items-center whitespace-nowrap transition-colors border border-transparent hover:border-white/30">
              Today&apos;s Deals
            </Link>

            {/* Sell */}
            {(!role || role === 1) && (
              <Link href="/sell"
                className="flex-shrink-0 text-white hover:bg-[#37475a] text-xs font-semibold px-3 h-full flex items-center whitespace-nowrap transition-colors border border-transparent hover:border-white/30">
                Sell on RNVS
              </Link>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-gray-600 mx-0.5 flex-shrink-0" />

            {/* All categories scrollable */}
            {categories.map((cat) => (
              <Link key={cat.id} href={`/?category=${encodeURIComponent(cat.name)}`}
                className="flex-shrink-0 text-gray-200 hover:bg-[#37475a] hover:text-white text-xs px-3 h-full flex items-center whitespace-nowrap transition-colors border border-transparent hover:border-white/30 font-medium">
                {cat.name}
              </Link>
            ))}

          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-4">
            <form onSubmit={handleSearch} className="mb-4 flex">
              <input type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 px-4 py-2.5 text-sm text-slate-800 border border-gray-200 border-r-0 rounded-l-lg focus:outline-none focus:border-indigo-400 bg-gray-50"
              />
              <button type="submit" className="px-4 bg-indigo-600 hover:bg-indigo-700 rounded-r-lg transition-colors">
                <Search size={16} className="text-white" />
              </button>
            </form>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.slice(0, 8).map((cat) => (
                <Link key={cat.id} href={`/?category=${encodeURIComponent(cat.name)}`}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-slate-600 hover:text-indigo-600 py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                  {cat.name}
                </Link>
              ))}
            </div>
            {!isAuthenticated && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setMobileOpen(false); openLoginModal('login'); }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors">
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileOpen(false); openLoginModal('register'); }}
                  className="flex-1 py-2.5 border-2 border-indigo-600 text-indigo-600 text-sm font-bold rounded-lg hover:bg-indigo-50 transition-colors">
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
