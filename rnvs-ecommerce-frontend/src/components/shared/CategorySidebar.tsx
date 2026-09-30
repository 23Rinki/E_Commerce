'use client';

import { LayoutGrid } from 'lucide-react';
import { Category } from '@/types';
import { CATEGORY_ICON_MAP as ICON_MAP, CATEGORY_ICON_FALLBACK as FALLBACK } from '@/lib/categoryIcons';

interface Props {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Renders a vertical category sidebar on desktop (lg+) and
 * a horizontal chip row on mobile.
 * Place this as the first child of a `flex flex-col lg:flex-row` container.
 */
export default function CategorySidebar({ categories, selectedId, onSelect }: Props) {
  const allActive = !selectedId;

  const rowCls = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm text-left transition-colors cursor-pointer
     ${active ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'}`;

  const chipCls = (active: boolean) =>
    `flex-shrink-0 h-9 px-4 rounded-full text-xs font-medium border transition-colors cursor-pointer
     ${active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900'}`;

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="hidden lg:block w-56 flex-shrink-0 self-start sticky top-32">
        <div className="text-xs uppercase tracking-[0.3em] text-neutral-500 px-3 mb-3">Categories</div>
        <nav className="overflow-y-auto no-scrollbar space-y-0.5" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <button onClick={() => onSelect('')} className={rowCls(allActive)}>
            <LayoutGrid size={15} className={allActive ? 'text-white' : 'text-neutral-400'} strokeWidth={1.8} />
            All Products
          </button>

          {categories.map((cat) => {
            const { Icon } = ICON_MAP[cat.name] ?? FALLBACK;
            const active = cat.name === selectedId;
            return (
              <button key={cat.id} onClick={() => onSelect(cat.name)} className={rowCls(active)}>
                <Icon size={15} strokeWidth={1.8} className={`flex-shrink-0 ${active ? 'text-white' : 'text-neutral-400'}`} />
                <span className="truncate leading-tight">{cat.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile chip row ─────────────────────────────────────────────── */}
      <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        <button onClick={() => onSelect('')} className={chipCls(allActive)}>All</button>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => onSelect(cat.name)} className={chipCls(cat.name === selectedId)}>
            {cat.name}
          </button>
        ))}
      </div>
    </>
  );
}
