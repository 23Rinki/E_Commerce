import { categoriesApi } from './api';
import type { Category } from '@/types';

let _cache: Category[] = [];
let _inflight: Promise<Category[]> | null = null;

export function getCachedCategories(): Category[] {
  return _cache;
}

export function clearCategories(): void {
  _cache = [];
  _inflight = null;
}

export function loadCategories(): Promise<Category[]> {
  if (_cache.length > 0) return Promise.resolve(_cache);
  if (_inflight) return _inflight;
  _inflight = categoriesApi.getAll()
    .then((r) => {
      const raw = r.data?.data ?? r.data ?? [];
      _cache = Array.isArray(raw) ? raw : [];
      return _cache;
    })
    .catch(() => [])
    .finally(() => { _inflight = null; });
  return _inflight;
}
