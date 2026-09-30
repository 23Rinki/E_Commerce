'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cartApi } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react';

export default function CartPage() {
  const { cart, setCart, clearCart } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    cartApi.get()
      .then((r) => { setCart(r.data?.data || r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleUpdate = async (itemId: number, qty: number) => {
    setUpdating(itemId);
    try {
      if (qty <= 0) {
        await cartApi.remove(itemId);
      } else {
        await cartApi.update(itemId, qty);
      }
      const res = await cartApi.get();
      setCart(res.data?.data || res.data);
    } catch {
    } finally {
      setUpdating(null);
    }
  };

  const handleClear = async () => {
    try {
      await cartApi.clear();
      clearCart();
    } catch {}
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="bg-neutral-200 rounded-2xl h-24 mb-3" />)}
      </div>
    );
  }

  if (!cart || !cart.items?.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-neutral-50 border border-neutral-100 grid place-items-center"><ShoppingBag className="h-7 w-7 text-neutral-400" strokeWidth={1.6} /></div>
        <h2 className="font-display tracking-tight text-2xl text-neutral-900 mb-3">Your cart is empty</h2>
        <p className="text-neutral-500 mb-6">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/products" className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-8 py-3.5 rounded-full transition-colors">
          <ShoppingBag size={18} /> Start Shopping
        </Link>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const shipping = subtotal >= 1000 ? 0 : 50;
  const total = subtotal + shipping;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display tracking-tight text-2xl text-neutral-900">
          My Cart <span className="text-neutral-400 font-normal text-xl">({cart.items.length} items)</span>
        </h1>
        <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1.5 transition-colors">
          <Trash2 size={14} /> Clear Cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-neutral-100 p-4 flex gap-4 shadow-sm">
              <Link href={`/products/${item.productId}${item.vendorId ? `?v=${encodeURIComponent(item.vendorId)}` : ''}`} className="flex-shrink-0">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-50 border border-neutral-100">
                  <Image
                    src={getImageUrl(item.imageUrl)}
                    alt={item.productName}
                    width={80} height={80}
                    className="object-cover w-full h-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.productId}${item.vendorId ? `?v=${encodeURIComponent(item.vendorId)}` : ''}`}>
                  <h3 className="font-semibold text-neutral-800 text-sm hover:text-neutral-950 transition-colors line-clamp-2">
                    {item.productName}
                  </h3>
                </Link>
                <p className="text-xs text-neutral-500 mt-0.5">{formatPrice(item.unitPrice)} each</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleUpdate(item.id, item.quantity - 1)}
                      disabled={updating === item.id}
                      className="w-8 h-8 flex items-center justify-center hover:bg-neutral-50 transition-colors disabled:opacity-50"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdate(item.id, item.quantity + 1)}
                      disabled={updating === item.id}
                      className="w-8 h-8 flex items-center justify-center hover:bg-neutral-50 transition-colors disabled:opacity-50"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-neutral-900">{formatPrice(item.totalPrice)}</span>
                    <button
                      onClick={() => handleUpdate(item.id, 0)}
                      disabled={updating === item.id}
                      className="text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm sticky top-20">
            <h2 className="font-display tracking-tight text-neutral-900 text-lg mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal ({cart.items.length} items)</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
              </div>
              {shipping === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                  <Tag size={12} /> Free shipping applied!
                </div>
              )}
              {shipping > 0 && (
                <div className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-lg">
                  Add {formatPrice(1000 - subtotal)} more for free shipping
                </div>
              )}
            </div>
            <div className="border-t border-neutral-100 pt-4 mb-5">
              <div className="flex justify-between font-semibold text-neutral-900 text-lg">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Inclusive of all taxes</p>
            </div>
            <Link href="/checkout">
              <button className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-4 rounded-full transition-colors">
                Proceed to Checkout <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/products" className="block text-center text-sm text-neutral-900 hover:text-neutral-950 font-medium mt-3 transition-colors">
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
