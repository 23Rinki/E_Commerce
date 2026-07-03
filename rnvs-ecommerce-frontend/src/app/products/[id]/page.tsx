import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

// Server-to-server call uses HTTP (avoids self-signed cert issue on localhost)
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:5000';

async function fetchProduct(id: string, vendorId?: string) {
  try {
    const url = vendorId
      ? `${BACKEND}/api/products/${id}?v=${encodeURIComponent(vendorId)}`
      : `${BACKEND}/api/products/${id}`;
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json;
  } catch {
    return null;
  }
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
