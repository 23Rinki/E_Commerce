'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { wishlistApi, cartApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { Heart, ShoppingCart, Trash2, ArrowLeft, PackageOpen } from 'lucide-react';

interface WishlistItem {
  id: number;
  productId: number;
  productName: string | null;
  productPrice: number | null;
  productImageUrl: string | null;
  vendorId?: string | null;
  createdAt: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();
  const { setCart } = useCartStore();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    initAuth();
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    fetchWishlist();
  }, [isAuthenticated]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWishlist = async () => {
    try {
      const res = await wishlistApi.get();
      const data = res.data?.data || res.data;
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item: WishlistItem) => {
    setRemovingId(item.id);
    try {
      await wishlistApi.remove(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast('Removed from wishlist');
    } catch {
      showToast('Failed to remove item', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    setAddingToCart(item.productId);
    try {
      await cartApi.add({ productId: item.productId, quantity: 1, vendorId: item.vendorId ?? undefined });
      const cartRes = await cartApi.get();
      setCart(cartRes.data?.data || cartRes.data);
      showToast(`${item.productName || 'Item'} added to cart`);
    } catch {
      showToast('Failed to add to cart', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(items.map((i) => wishlistApi.remove(i.id)));
      setItems([]);
      showToast('Wishlist cleared');
    } catch {
      showToast('Failed to clear wishlist', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/account" className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-neutral-700" />
          </Link>
          <div>
            <h1 className="font-display tracking-tight text-2xl text-neutral-900">My Wishlist</h1>
            {!loading && items.length > 0 && (
              <p className="text-sm text-neutral-500">{items.length} {items.length === 1 ? 'item' : 'items'} saved</p>
            )}
          </div>
        </div>
        {!loading && items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-red-500 hover:text-red-700 font-semibold flex items-center gap-1.5 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
          >
            <Trash2 size={15} /> Clear all
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-neutral-200 rounded-2xl h-36 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <PackageOpen size={36} className="text-red-300" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-800 mb-2">Your wishlist is empty</h3>
          <p className="text-neutral-500 mb-6">Save items you love and come back to them anytime</p>
          <Link href="/products"
            className="bg-neutral-900 text-white font-semibold px-8 py-3 rounded-full hover:bg-neutral-800 transition-colors inline-block">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm hover:shadow-md transition-shadow flex gap-4">
              <Link href={`/products/${item.productId}${item.vendorId ? `?v=${encodeURIComponent(item.vendorId)}` : ''}`} className="flex-shrink-0">
                <div className="w-24 h-24 bg-neutral-100 rounded-xl overflow-hidden relative">
                  {item.productImageUrl ? (
                    <Image src={item.productImageUrl} alt={item.productName || ''} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart size={24} className="text-neutral-300" />
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.productId}${item.vendorId ? `?v=${encodeURIComponent(item.vendorId)}` : ''}`}>
                  <h3 className="font-semibold text-neutral-800 text-sm leading-snug hover:text-neutral-950 transition-colors line-clamp-2">
                    {item.productName || 'Product'}
                  </h3>
                </Link>
                <p className="text-neutral-900 font-semibold text-base mt-1">
                  {item.productPrice ? formatPrice(item.productPrice) : '—'}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Added {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={addingToCart === item.productId}
                    className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                  >
                    <ShoppingCart size={13} />
                    {addingToCart === item.productId ? 'Adding...' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={removingId === item.id}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
