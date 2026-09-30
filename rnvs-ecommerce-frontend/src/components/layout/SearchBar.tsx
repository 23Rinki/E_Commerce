'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, ArrowUpRight, LayoutGrid, ArrowRight } from 'lucide-react';
import { productsApi } from '@/lib/api';
import { getImageUrl, formatPrice } from '@/lib/utils';
import { Category } from '@/types';

interface Suggestion {
  id: string;
  vendorId: string;
  vendorName: string;
  title: string;
  imageUrl: string;
  price: number;
  category: string;
}

type Row =
  | { kind: 'recent'; value: string }
  | { kind: 'category'; value: string }
  | { kind: 'product'; value: Suggestion }
  | { kind: 'all'; value: string };

const RECENT_KEY = 'rnvs-recent-searches';
const MAX_RECENT = 5;

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function writeRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
}

/** Bold the part of `text` that matches `query` (case-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-semibold text-neutral-950">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

interface Props {
  categories: Category[];
  /** Called after navigating away (e.g. to close the mobile menu). */
  onNavigate?: () => void;
  autoFocus?: boolean;
}

export default function SearchBar({ categories, onNavigate, autoFocus }: Props) {
  const router = useRouter();
  const [query, setQuery]             = useState('');
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent]           = useState<string[]>([]);
  const [active, setActive]           = useState(-1);
  const boxRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqId    = useRef(0);

  useEffect(() => { setRecent(readRecent()); }, []);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = query.trim();

  const matchingCategories = useMemo(
    () => (q ? categories.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 3) : []),
    [categories, q],
  );

  // Flat list of selectable rows — drives both rendering order and keyboard navigation
  const rows: Row[] = useMemo(() => {
    if (!q) {
      return [
        ...recent.map((value): Row => ({ kind: 'recent', value })),
        ...categories.slice(0, 6).map((c): Row => ({ kind: 'category', value: c.name })),
      ];
    }
    return [
      ...matchingCategories.map((c): Row => ({ kind: 'category', value: c.name })),
      ...suggestions.map((s): Row => ({ kind: 'product', value: s })),
      { kind: 'all', value: q },
    ];
  }, [q, recent, categories, matchingCategories, suggestions]);

  const noResults = !!q && !loading && suggestions.length === 0 && matchingCategories.length === 0;

  const handleChange = (value: string) => {
    setQuery(value);
    setActive(-1);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    const term = value.trim();
    if (!term) { setSuggestions([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const id = ++reqId.current;
      try {
        const res = await productsApi.search(term, { pageSize: 6 });
        if (id !== reqId.current) return; // a newer keystroke already fired
        const results: any[] = res.data?.data ?? [];
        const seen = new Set<string>();
        const items: Suggestion[] = [];
        for (const r of results) {
          if (!r.title || seen.has(r.title)) continue;
          seen.add(r.title);
          const composite: string = r.id ?? '';
          const us = composite.indexOf('_');
          items.push({
            id: r.productId ?? '',
            vendorId: us > -1 ? composite.slice(0, us) : '',
            vendorName: r.vendorName ?? '',
            title: r.title,
            imageUrl: r.imageUrl ?? '',
            price: r.price ?? 0,
            category: r.category ?? '',
          });
          if (items.length === 5) break;
        }
        setSuggestions(items);
      } catch {
        if (id === reqId.current) setSuggestions([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
  };

  const remember = (term: string) => {
    const next = [term, ...recent.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT);
    setRecent(next);
    writeRecent(next);
  };

  const finish = (href: string) => {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(href);
    onNavigate?.();
  };

  const searchFor = (term: string) => {
    if (!term) return;
    remember(term);
    setQuery(term);
    finish(`/products?search=${encodeURIComponent(term)}`);
  };

  const choose = (row: Row) => {
    switch (row.kind) {
      case 'recent':
        return searchFor(row.value);
      case 'all':
        return noResults ? finish('/products') : searchFor(row.value);
      case 'category':
        setQuery('');
        return finish(`/products?category=${encodeURIComponent(row.value)}`);
      case 'product': {
        const s = row.value;
        if (q) remember(q);
        return finish(`/products/${s.id}${s.vendorId ? `?v=${encodeURIComponent(s.vendorId)}` : ''}`);
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (rows.length ? (i + 1) % rows.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (rows.length ? (i <= 0 ? rows.length - 1 : i - 1) : -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && rows[active]) choose(rows[active]);
    else searchFor(q);
  };

  const clearRecent = () => { setRecent([]); writeRecent([]); };

  // Row index lookup so each rendered row knows whether it's keyboard-highlighted
  let idx = -1;
  const rowClass = (i: number) =>
    `w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${i === active ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`;

  const showDropdown = open && (q ? true : rows.length > 0);
  const productRows = q ? suggestions : [];

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={onSubmit}
        role="search"
        className={`flex w-full items-center gap-2 rounded-full border bg-neutral-50 pl-4 pr-1.5 py-1.5 transition-colors ${open ? 'border-neutral-900 bg-white' : 'border-neutral-300 hover:border-neutral-400'}`}
      >
        <Search className="h-4 w-4 text-neutral-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search products, brands and more…"
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder:text-neutral-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => { handleChange(''); inputRef.current?.focus(); }}
            aria-label="Clear search"
            className="h-7 w-7 grid place-items-center rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-900 hover:bg-neutral-800 grid place-items-center transition-colors"
        >
          <Search size={14} className="text-white" />
        </button>
      </form>

      {showDropdown && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-100 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-20px_rgba(0,0,0,0.2)] z-50 overflow-hidden max-h-[70vh] overflow-y-auto"
        >
          {/* ── Empty query: recent searches + popular categories ── */}
          {!q && recent.length > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 pt-1 pb-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Recent searches</span>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearRecent}
                  className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors">
                  Clear
                </button>
              </div>
              {recent.map((r) => {
                const i = ++idx;
                return (
                  <button key={`r-${r}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(rows[i])} onMouseEnter={() => setActive(i)} className={rowClass(i)}>
                    <Clock className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                    <span className="flex-1 truncate text-neutral-700">{r}</span>
                    <ArrowUpRight className="h-4 w-4 text-neutral-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {!q && categories.length > 0 && (
            <div className={`py-2 ${recent.length ? 'border-t border-neutral-100' : ''}`}>
              <div className="px-4 pt-1 pb-2 text-[11px] uppercase tracking-[0.2em] text-neutral-500">Popular categories</div>
              <div className="px-3 pb-2 flex flex-wrap gap-2">
                {categories.slice(0, 6).map((c) => {
                  const i = ++idx;
                  return (
                    <button key={`c-${c.id}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(rows[i])} onMouseEnter={() => setActive(i)}
                      className={`px-3.5 h-8 rounded-full border text-xs font-medium transition-colors ${i === active ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-700 hover:border-neutral-900'}`}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Typed query ── */}
          {q && matchingCategories.length > 0 && (
            <div className="py-2 border-b border-neutral-100">
              <div className="px-4 pt-1 pb-1.5 text-[11px] uppercase tracking-[0.2em] text-neutral-500">Categories</div>
              {matchingCategories.map((c) => {
                const i = ++idx;
                return (
                  <button key={`mc-${c.id}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(rows[i])} onMouseEnter={() => setActive(i)} className={rowClass(i)}>
                    <LayoutGrid className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                    <span className="flex-1 truncate text-neutral-700"><Highlight text={c.name} query={q} /></span>
                  </button>
                );
              })}
            </div>
          )}

          {q && (
            <div className="py-2">
              <div className="px-4 pt-1 pb-1.5 text-[11px] uppercase tracking-[0.2em] text-neutral-500">Products</div>

              {loading && suggestions.length === 0 && (
                <div className="px-4 py-2 space-y-3">
                  {[0, 1, 2].map((k) => (
                    <div key={k} className="flex items-center gap-3 animate-pulse">
                      <div className="h-12 w-12 rounded-xl bg-neutral-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded-full bg-neutral-100 w-2/3" />
                        <div className="h-2.5 rounded-full bg-neutral-100 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {noResults && (
                <div className="px-4 py-6 text-center">
                  <p className="font-display text-lg text-neutral-900">No matches for &ldquo;{q}&rdquo;</p>
                  <p className="mt-1 text-xs text-neutral-500">Check the spelling or try a more general term.</p>
                </div>
              )}

              {productRows.map((s) => {
                const i = ++idx;
                return (
                  <button key={`p-${s.vendorId}_${s.id}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(rows[i])} onMouseEnter={() => setActive(i)} className={rowClass(i)}>
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-neutral-50 border border-neutral-100 overflow-hidden">
                      <img
                        src={getImageUrl(s.imageUrl)}
                        alt=""
                        className="h-full w-full object-contain p-1"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-neutral-700"><Highlight text={s.title} query={q} /></p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {[s.category, s.vendorName && `Sold by ${s.vendorName}`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {s.price > 0 && <span className="flex-shrink-0 text-sm font-semibold text-neutral-900">{formatPrice(s.price)}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {q && (() => {
            const i = ++idx;
            return (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(rows[i])} onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center justify-between px-4 py-3.5 border-t border-neutral-100 text-sm font-medium transition-colors ${i === active ? 'bg-neutral-900 text-white' : 'text-neutral-900 hover:bg-neutral-50'}`}>
                <span className="truncate">{noResults ? 'Browse all products' : <>See all results for &ldquo;{q}&rdquo;</>}</span>
                <ArrowRight className="h-4 w-4 flex-shrink-0" />
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
