import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

export function truncate(str: string, length: number) {
  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function getImageUrl(path: string | null | undefined) {
  if (!path) return '/placeholder.png';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
  return `${process.env.NEXT_PUBLIC_API_URL}/uploads/${path}`;
}
