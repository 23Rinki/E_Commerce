'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, ShoppingCart, Heart, Star, ArrowRight, CheckCircle, Minus, Plus } from 'lucide-react';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { cartApi, wishlistApi } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';

interface QuickViewProduct {
  id: number;
  name: string;
  price: number;
  discountPrice?: number | null;
  primaryImageUrl?: string | null;
  images?: { imageUrl: string; isPrimary?: boolean }[];
  stockQuantity?: number;
  categoryName?: string;
  shortDescription?: string;
  vendorName?: string;
  vendorId?: string;
}

interface Props {
  product: QuickViewProduct;
  onClose: () => void;
}

export default function ProductQuickView({ product, onClose }: Props) {
  const { incrementCount } = useCartStore();
  const [qty, setQty]           = useState(1);
  const [adding, setAdding]     = useState(false);
  const [added, setAdded]       = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);

  const img = product.primaryImageUrl ?? product.images?.find(i => i.isPrimary)?.imageUrl ?? product.images?.[0]?.imageUrl ?? null;
  const price        = Number(product.price) || 0;
  const displayPrice = product.discountPrice ? Number(product.discountPrice) : price;
  const pct          = product.discountPrice ? Math.round(((price - displayPrice) / price) * 100) : 0;
  const stock        = product.stockQuantity ?? null;
  const outOfStock   = stock !== null && stock === 0;
  const displayStock = stock ?? 99;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding || outOfStock) return;
    setAdding(true);
    incrementCount(qty);
    try {
      await cartApi.add({ productId: product.id, quantity: qty, vendorId: product.vendorId });
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch {
      incrementCount(-qty);
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wishLoading) return;
    setWishLoading(true);
    try {
      if (!wishlisted) {
        await wishlistApi.add(product.id);
        setWishlisted(true);
      } else {
        setWishlisted(false);
      }
    } catch {
    } finally {
      setWishLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[920px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <X size={16} className="text-gray-600" />
        </button>

        <div className="flex flex-col sm:flex-row">

          {/* ── Image panel ─────────────────────────────────── */}
          <div className="relative bg-gray-50 sm:w-[420px] flex-shrink-0 flex items-center justify-center p-8 min-h-72">
            {pct > 0 && (
              <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
                -{pct}%
              </span>
            )}
            <img
              src={getImageUrl(img)}
              alt={product.name}
              className="w-full max-h-80 object-contain transition-transform duration-300 hover:scale-105"
              onError={e => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
            />
          </div>

          {/* ── Details panel ────────────────────────────────── */}
          <div className="flex-1 p-6 flex flex-col">

            {/* Category + name */}
            {product.categoryName && (
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
                {product.categoryName}
              </p>
            )}
            <h2 className="text-base font-semibold text-slate-900 leading-snug mb-2">
              {product.name}
            </h2>

            {/* Sold by */}
            {product.vendorName && (
              <p className="text-xs text-gray-500 mb-2">Sold by <span className="text-slate-700 font-medium">{product.vendorName}</span></p>
            )}

            {/* Stars */}
            <div className="flex items-center gap-1 mb-3">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={13} fill="#FFA41C" className="text-[#FFA41C]" />
              ))}
              <span className="text-xs text-gray-400 ml-1">
                ({((product.id * 137 + 43) % 480) + 20} ratings)
              </span>
            </div>

            {/* Price */}
            <div className="mb-3">
              {pct > 0 && (
                <p className="text-xs text-gray-400 line-through">{formatPrice(price)}</p>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{formatPrice(displayPrice)}</span>
                {pct > 0 && (
                  <span className="text-sm font-semibold text-green-600">{pct}% off</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Inclusive of all taxes</p>
            </div>

            {/* Stock */}
            <p className={`text-xs font-semibold mb-3 ${outOfStock ? 'text-red-500' : stock < 10 ? 'text-amber-600' : 'text-green-600'}`}>
              {outOfStock ? 'Out of Stock' : (stock !== null && stock < 10) ? `Only ${stock} left — order soon` : 'In Stock'}
            </p>

            {/* Short description */}
            {product.shortDescription && (
              <p className="text-xs text-gray-600 mb-3 leading-relaxed line-clamp-2">
                {product.shortDescription}
              </p>
            )}

            <div className="mt-auto space-y-2.5">
              {/* Quantity */}
              {!outOfStock && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">Qty</span>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={e => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)); }}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold border-x border-gray-200">{qty}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setQty(q => Math.min(displayStock, q + 1)); }}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={adding || outOfStock}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${added
                    ? 'bg-green-500 text-white'
                    : outOfStock
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98]'}`}
              >
                {added
                  ? <><CheckCircle size={15} /> Added to Cart</>
                  : adding
                    ? 'Adding…'
                    : <><ShoppingCart size={15} /> Add to Cart</>}
              </button>

              {/* Wishlist + Full details */}
              <div className="flex gap-2">
                <button
                  onClick={handleWishlist}
                  disabled={wishLoading}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                    ${wishlisted
                      ? 'border-red-300 bg-red-50 text-red-500'
                      : 'border-gray-200 text-slate-600 hover:border-red-300 hover:text-red-500'}`}
                >
                  <Heart size={13} fill={wishlisted ? 'currentColor' : 'none'} />
                  {wishlisted ? 'Saved' : 'Wishlist'}
                </button>

                <Link
                  href={`/products/${product.id}${(product as any).vendorId ? `?v=${encodeURIComponent((product as any).vendorId)}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-slate-600 hover:border-orange-400 hover:text-orange-500 transition-all"
                >
                  Full Details <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
