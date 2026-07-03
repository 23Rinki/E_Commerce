'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingCart, Heart, Eye } from 'lucide-react';
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
  const discount = product.discountPrice
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

  return (
    <>
      {showQuickView && (
        <ProductQuickView product={qvProduct} onClose={() => setShowQuickView(false)} />
      )}

      <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer">
        {/* Image */}
        <div className="relative h-52 bg-gray-50 overflow-hidden">
          <Link href={`/products/${product.id}${(product as any).vendorId ? `?v=${encodeURIComponent((product as any).vendorId)}` : ''}`} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            <Image
              src={getImageUrl(img)}
              alt={product.name}
              fill
              unoptimized
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
            />
          </Link>

          {discount && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full pointer-events-none z-10">
              -{discount}%
            </div>
          )}

          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-60 z-10
              ${wishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500 shadow'}`}
          >
            <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Quick View hover overlay */}
          <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }}
              className="w-full flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 transition-colors"
            >
              <Eye size={13} />
              Quick View
            </button>
          </div>
        </div>

        {/* Content */}
        <Link href={`/products/${product.id}${(product as any).vendorId ? `?v=${encodeURIComponent((product as any).vendorId)}` : ''}`} target="_blank" rel="noopener noreferrer" className="block p-4">
          <p className="text-xs text-orange-500 font-medium mb-1 uppercase tracking-wide">
            {(product as any).categoryName ?? product.category?.name ?? 'Product'}
          </p>
          <h3 className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {product.averageRating !== undefined && product.averageRating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex items-center gap-0.5 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                <span>{product.averageRating.toFixed(1)}</span>
                <Star size={10} fill="white" />
              </div>
              <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-slate-900">
              {formatPrice(product.discountPrice || product.price)}
            </span>
            {product.discountPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            <ShoppingCart size={15} />
            {adding ? 'Adding...' : 'Add to Cart'}
          </button>
        </Link>
      </div>
    </>
  );
}
