import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { BACKEND_URL as BACKEND } from '@/lib/server/backend';

// Returns null only when the API says the product doesn't exist; any other failure throws,
// so an unreachable backend shows the error page instead of a misleading "not found".
async function fetchProduct(id: string, vendorId?: string) {
  const url = vendorId
    ? `${BACKEND}/api/products/${id}?v=${encodeURIComponent(vendorId)}`
    : `${BACKEND}/api/products/${id}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Product API returned ${res.status}`);
  const json = await res.json();
  return json?.data ?? json;
}

async function fetchReviews(id: string): Promise<any[]> {
  try {
    const res = await fetch(`${BACKEND}/api/reviews/product/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    const raw = json?.data ?? json;
    return Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  const { v } = await searchParams;

  const [product, reviews] = await Promise.all([
    fetchProduct(id, v),
    fetchReviews(id),
  ]);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} reviews={reviews} />;
}
