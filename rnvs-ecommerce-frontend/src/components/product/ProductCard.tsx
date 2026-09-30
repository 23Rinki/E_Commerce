'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, Plus, Heart, Eye } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { cartApi, wishlistApi } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import { useState, useRef } from 'react';
import ProductQuickView from './ProductQuickView';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { incrementCount } = useCartStore();
  const [adding, setAdding]           = useState(false);
  const [wishlisted, setWishlisted]   = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showQuickView, setShowQuickView]     = useState(false);
  const wishlistItemId = useRef<number | null>(null);

  const primaryImage = product.images?.find((i) => i.isPrimary) || product.images?.[0];
  const img = (product as any).primaryImageUrl ?? primaryImage?.imageUrl ?? null;
  const discount = product.discountPrice && product.discountPrice < product.price
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : null;

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

  const qvProduct = {
    id: Number(product.id),
    name: product.name,
    price: product.price,
    discountPrice: product.discountPrice,
    primaryImageUrl: img,
    images: product.images,
    stockQuantity: (product as any).stockQuantity,
    categoryName: (product as any).categoryName ?? product.category?.name,
    shortDescription: (product as any).shortDescription,
    vendorName: (product as any).vendorName,
    vendorId: (product as any).vendorId,
  };

  const selling = product.discountPrice ?? product.price;
  const href = `/products/${product.id}${(product as any).vendorId ? `?v=${encodeURIComponent((product as any).vendorId)}` : ''}`;
  const categoryName = (product as any).categoryName ?? product.category?.name;

  return (
    <article className="group relative">
      {showQuickView && (
        <ProductQuickView product={qvProduct} onClose={() => setShowQuickView(false)} />
      )}

      <Link href={href}>
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

          {discount !== null && discount > 0 && (
            <span className="absolute top-3 left-3 text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-neutral-900 text-white">
              −{discount}%
            </span>
          )}

          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full backdrop-blur bg-white/85 border border-neutral-100 transition-all duration-300 disabled:opacity-60 ${wishlisted ? 'text-red-500 opacity-100' : 'text-neutral-700 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
          >
            <Heart className={`h-4 w-4 ${wishlisted ? 'fill-current' : ''}`} />
          </button>

          <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="flex-1 h-11 rounded-full bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 transition inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> {adding ? 'Adding…' : 'Add to Bag'}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }}
              aria-label="Quick view"
              className="h-11 w-11 flex-shrink-0 rounded-full bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 grid place-items-center transition"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="pt-4 px-1">
          {categoryName && (
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1 truncate">{categoryName}</div>
          )}
          <h3 className="text-[15px] font-medium text-neutral-900 leading-snug line-clamp-2">{product.name}</h3>
          {product.averageRating !== undefined && product.averageRating > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Star className="h-3.5 w-3.5 fill-neutral-900 text-neutral-900" />
              <span className="text-xs font-medium text-neutral-700">{product.averageRating.toFixed(1)}</span>
              <span className="text-xs text-neutral-400">({product.reviewCount ?? 0})</span>
            </div>
          )}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-semibold text-neutral-900">{formatPrice(selling)}</span>
            {discount !== null && discount > 0 && (
              <span className="text-sm text-neutral-400 line-through">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] rounded-2xl bg-neutral-100" />
      <div className="pt-4 px-1 space-y-2">
        <div className="h-3 bg-neutral-100 rounded-full w-1/3" />
        <div className="h-3.5 bg-neutral-100 rounded-full w-full" />
        <div className="h-4 bg-neutral-100 rounded-full w-1/2" />
      </div>
    </div>
  );
}
