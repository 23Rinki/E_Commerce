'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { productsApi, cartApi, wishlistApi } from '@/lib/api';
import { Review } from '@/types';
import { getImageUrl } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { Star, ShoppingCart, Heart, Shield, Truck, RotateCcw, CheckCircle, X } from 'lucide-react';

// ── Zoom ──────────────────────────────────────────────────────────────────────

const LENS = 130;
const ZOOM = 430;

interface ZS {
  lx: number; ly: number;
  bsw: number; bsh: number;
  bpx: number; bpy: number;
  panelTop: number; panelLeft: number;
}

function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [on, setOn] = useState(false);
  const [z, setZ] = useState<ZS>({ lx: 0, ly: 0, bsw: 0, bsh: 0, bpx: 0, bpy: 0, panelTop: 0, panelLeft: 0 });
  const [lb, setLb] = useState(false);

  const move = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const lx = Math.max(0, Math.min(e.clientX - r.left - LENS / 2, r.width - LENS));
    const ly = Math.max(0, Math.min(e.clientY - r.top - LENS / 2, r.height - LENS));
    const ratio = ZOOM / LENS;
    setZ({
      lx, ly,
      bsw: (r.width / LENS) * ZOOM,
      bsh: (r.height / LENS) * ZOOM,
      bpx: -lx * ratio,
      bpy: -ly * ratio,
      panelTop: r.top,
      panelLeft: r.right + 12,
    });
  }, []);

  return (
    <>
      <div
        className="relative bg-white border border-neutral-200 select-none"
        style={{ width: '100%', paddingBottom: '100%', cursor: on ? 'crosshair' : 'zoom-in' }}
        onMouseEnter={() => setOn(true)}
        onMouseMove={move}
        onMouseLeave={() => setOn(false)}
        onDoubleClick={() => setLb(true)}
      >
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-contain p-3 pointer-events-none"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
          draggable={false}
        />
        {on && (
          <div
            className="absolute border border-neutral-500/50 bg-amber-100/30 pointer-events-none z-10"
            style={{ width: LENS, height: LENS, left: z.lx, top: z.ly }}
          />
        )}
      </div>

      <p className="text-[11px] text-neutral-400 text-center mt-2 hidden lg:block">
        Hover to zoom · Double-click for full view
      </p>

      {on && (
        <div
          className="hidden lg:block pointer-events-none border border-neutral-300 shadow-2xl bg-white overflow-hidden"
          style={{
            position: 'fixed',
            top: z.panelTop,
            left: z.panelLeft,
            width: ZOOM,
            height: ZOOM,
            zIndex: 9999,
          }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              width: z.bsw,
              height: z.bsh,
              left: z.bpx,
              top: z.bpy,
              maxWidth: 'none',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {lb && (
        <div
          className="fixed inset-0 bg-black/92 z-[10000] flex items-center justify-center p-6"
          onClick={() => setLb(false)}
        >
          <button
            onClick={() => setLb(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
          />
        </div>
      )}
    </>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

interface Props {
  product: any;
  reviews: Review[];
}

export default function ProductDetailClient({ product, reviews }: Props) {
  const router = useRouter();
  const { setCart } = useCartStore();

  const [otherSellers, setOtherSellers] = useState<any[]>([]);
  const [selIdx, setSelIdx]             = useState(0);
  const [selVariant, setSelVariant]     = useState<number | null>(null);
  const [qty, setQty]                   = useState(1);
  const [adding, setAdding]             = useState(false);
  const [added, setAdded]               = useState(false);
  const [wishlisted, setWishlisted]     = useState(false);

  // Track product view — works for both guests (sessionId from sessionStorage) and logged-in users
  useEffect(() => {
    if (!product?.id) return;
    let sessionId = sessionStorage.getItem('rnvs_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('rnvs_session_id', sessionId);
    }
    productsApi.trackView(product.id, sessionId, document.referrer || undefined);
  }, [product?.id]);

  // Fetch other sellers in the background after render
  useEffect(() => {
    if (!product?.name) return;
    productsApi.getAll({ pageSize: 200, pageNumber: 1 })
      .then((r) => {
        const raw = r.data?.data ?? r.data ?? {};
        const items: any[] = raw?.items ?? (Array.isArray(raw) ? raw : []);
        const others = items.filter(
          (p) => String(p.id) !== String(product.id) &&
                 (p.name ?? '').toLowerCase().trim() === product.name.toLowerCase().trim()
        );
        setOtherSellers(others);
      })
      .catch(() => {});
  }, [product]);

  const addToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await cartApi.add({ productId: Number(product.id), quantity: qty, variantId: selVariant ?? undefined, vendorId: (product as any).vendorId });
      const r = await cartApi.get();
      setCart(r.data?.data ?? r.data);
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    } catch { /* ignore */ } finally { setAdding(false); }
  };

  // Normalise image sources
  const rawUrls: string[] = product.imageUrls ?? (product.images?.map((i: any) => i.imageUrl) ?? []);
  const srcs = rawUrls.length > 0 ? rawUrls.map(getImageUrl) : ['/placeholder.png'];
  const currentSrc = srcs[selIdx] ?? srcs[0];

  const price        = Number(product.price) || 0;
  const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
  const displayPrice  = discountPrice ?? price;
  const pct           = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0;
  const saved         = price - displayPrice;

  const ratingCount = reviews.length || (((Number(product.id) * 137 + 43) % 1980) + 20);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-neutral-500 mb-5 flex-wrap">
          <Link href="/" className="hover:text-neutral-950">Home</Link>
          <span className="text-neutral-400">›</span>
          <Link href="/products" className="hover:text-neutral-950">Products</Link>
          {product.categoryName && (
            <>
              <span className="text-neutral-400">›</span>
              <span className="text-neutral-500">{product.categoryName}</span>
            </>
          )}
          <span className="text-neutral-400">›</span>
          <span className="text-neutral-700 font-medium truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Main grid */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Image column ─────────────────────────────────── */}
          <div className="flex gap-3 lg:w-[420px] flex-shrink-0">
            {srcs.length > 1 && (
              <div className="flex flex-col gap-2 flex-shrink-0">
                {srcs.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setSelIdx(i)}
                    className={`w-14 h-14 border-2 rounded-xl overflow-hidden transition-all flex-shrink-0
                      ${selIdx === i ? 'border-neutral-900' : 'border-neutral-200 hover:border-neutral-400'}`}
                  >
                    <img
                      src={src}
                      alt={`View ${i + 1}`}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1">
              {pct > 0 && (
                <div className="absolute top-2 left-2 z-20 bg-neutral-900 text-white text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full leading-none">
                  -{pct}%
                </div>
              )}
              <ImageZoom src={currentSrc} alt={product.name} />
            </div>
          </div>

          {/* ── Product info column ───────────────────────────── */}
          <div className="flex-1 min-w-0 max-w-lg">

            <h1 className="font-display tracking-tight text-3xl lg:text-4xl text-neutral-900 mb-3 leading-tight">{product.name}</h1>

            {product.vendorName && (
              <p className="text-sm text-neutral-600 mb-2">
                Sold by{' '}
                <span className="font-medium text-neutral-900 underline underline-offset-4 decoration-neutral-300">{product.vendorName}</span>
              </p>
            )}

            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} className="text-neutral-900" fill="currentColor" />
                ))}
              </div>
              <span className="text-sm text-neutral-500">
                {ratingCount.toLocaleString()} ratings
              </span>
            </div>

            {/* Price block */}
            <div className="mb-5 pb-5 border-b border-neutral-200">
              {pct > 0 && (
                <p className="text-sm text-neutral-600 mb-0.5">
                  M.R.P.:{' '}
                  <span className="line-through text-neutral-500">
                    ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </p>
              )}
              <div className="flex items-baseline gap-2">
                {pct > 0 && <span className="text-sm font-semibold px-2.5 py-1 rounded-full bg-neutral-900 text-white self-center">−{pct}%</span>}
                <span className="font-display text-4xl text-neutral-900">
                  ₹{displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {pct > 0 && (
                <p className="text-sm text-green-700 mt-0.5">
                  You save: ₹{saved.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({pct}%)
                </p>
              )}
              <p className="text-xs text-neutral-500 mt-1">Inclusive of all taxes</p>
            </div>

            {/* Stock */}
            {product.stockQuantity !== undefined && (
              <p className={`text-sm font-semibold mb-4 ${product.stockQuantity > 0 ? 'text-green-700' : 'text-red-600'}`}>
                {product.stockQuantity > 0
                  ? product.stockQuantity < 10
                    ? `Only ${product.stockQuantity} left in stock — order soon`
                    : 'In Stock'
                  : 'Out of Stock'}
              </p>
            )}

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-neutral-800 mb-2">Style:</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelVariant(v.id)}
                      className={`h-10 px-4 border text-sm rounded-full transition-all
                        ${selVariant === Number(v.id)
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-300 hover:border-neutral-500'}`}
                    >
                      {v.name}: {v.value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-5">
              <label className="text-sm font-semibold text-neutral-700">Qty:</label>
              <div className="flex items-center border border-neutral-200 rounded-full overflow-hidden">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 text-lg transition-colors"
                >−</button>
                <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(99, q + 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 text-lg transition-colors"
                >+</button>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2.5 max-w-xs mb-5">
              <button
                onClick={addToCart}
                disabled={adding || product.stockQuantity === 0}
                className={`w-full h-12 rounded-full text-sm font-medium border transition-all flex items-center justify-center gap-2
                  ${added
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-900 text-white disabled:opacity-50'}`}
              >
                {added
                  ? <><CheckCircle size={16} /> Added to Cart</>
                  : adding
                    ? 'Adding…'
                    : <><ShoppingCart size={16} /> Add to Cart</>}
              </button>

              <button
                onClick={async () => { await addToCart(); router.push('/cart'); }}
                disabled={product.stockQuantity === 0}
                className="w-full h-12 rounded-full text-sm font-medium bg-white hover:bg-neutral-50 border border-neutral-900 text-neutral-900 transition-all disabled:opacity-50"
              >
                Buy Now
              </button>

              <button
                onClick={async () => {
                  try {
                    if (!wishlisted) { await wishlistApi.add(Number(product.id)); setWishlisted(true); }
                    else setWishlisted(false);
                  } catch { /* ignore */ }
                }}
                className={`flex items-center justify-center gap-2 w-full h-12 rounded-full text-sm font-medium border transition-all
                  ${wishlisted
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : 'border-neutral-300 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'}`}
              >
                <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
                {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
              </button>
            </div>

            {/* Trust badges */}
            <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
              {[
                { icon: Truck,     label: 'Free Delivery',  sub: 'On orders above ₹499' },
                { icon: RotateCcw, label: 'Easy Returns',   sub: '7-day return policy' },
                { icon: Shield,    label: 'Secure Payment', sub: '100% protected' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2.5">
                  <Icon size={18} className="text-neutral-500 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold text-neutral-800">{label}</span>
                    <span className="text-neutral-500 ml-1.5">{sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Other sellers */}
        {otherSellers.length > 0 && (
          <div className="mt-8 pt-6 border-t border-neutral-200 max-w-3xl">
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-3">
              Other sellers offering this product
            </h2>
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden">
              {otherSellers.map((seller) => {
                const sellerPrice = seller.discountPrice ?? seller.price;
                return (
                  <div key={seller.id} className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-neutral-50 transition-colors">
                    <Link href={`/products/${seller.id}${seller.vendorId ? `?v=${encodeURIComponent(seller.vendorId)}` : ''}`} className="w-12 h-12 border border-neutral-200 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-white">
                      <img
                        src={getImageUrl(seller.primaryImageUrl ?? null)}
                        alt={seller.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-800">
                        ₹{Math.floor(sellerPrice).toLocaleString('en-IN')}
                      </p>
                      {seller.discountPrice && (
                        <p className="text-[11px] text-neutral-400 line-through">
                          ₹{Math.floor(seller.price).toLocaleString('en-IN')}
                        </p>
                      )}
                      <Link href={`/products/${seller.id}${seller.vendorId ? `?v=${encodeURIComponent(seller.vendorId)}` : ''}`} className="text-[11px] text-neutral-900 underline underline-offset-2 hover:text-neutral-600 mt-0.5 block">
                        View this offer →
                      </Link>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await cartApi.add({ productId: Number(seller.id), quantity: 1, vendorId: seller.vendorId });
                          const r = await cartApi.get();
                          setCart(r.data?.data ?? r.data);
                        } catch { /* ignore */ }
                      }}
                      className="flex-shrink-0 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-900 rounded-full text-xs font-medium text-white transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* About this item */}
        {product.description && (
          <div className="mt-10 pt-8 border-t border-neutral-200 max-w-3xl">
            <h2 className="font-display tracking-tight text-xl text-neutral-900 mb-4">About this item</h2>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-10 pt-8 border-t border-neutral-200 max-w-3xl mb-10">
          <h2 className="font-display tracking-tight text-xl text-neutral-900 mb-6">Customer Reviews</h2>
          {reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((r) => (
                <div key={r.id} className="pb-6 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-700 font-semibold text-sm">{r.userName?.[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-800">{r.userName}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        fill={i < r.rating ? '#171717' : '#e5e5e5'}
                        className={i < r.rating ? 'text-neutral-900' : 'text-neutral-200'}
                      />
                    ))}
                    <span className="text-xs text-neutral-400 ml-1.5">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No reviews yet. Be the first to review this product!</p>
          )}
        </div>

      </div>
    </div>
  );
}
