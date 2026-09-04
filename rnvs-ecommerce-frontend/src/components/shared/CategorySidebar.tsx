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

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="hidden lg:block w-52 flex-shrink-0 self-start sticky top-20">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Shop by Category
            </h2>
          </div>
          <nav className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
            <button
              onClick={() => onSelect('')}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors border-l-2 cursor-pointer
                ${allActive
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:bg-gray-50 hover:text-slate-800'}`}
            >
              <LayoutGrid size={14} className={allActive ? 'text-orange-500' : 'text-gray-400'} />
              All Products
            </button>

            {categories.map((cat) => {
              const { Icon, color } = ICON_MAP[cat.name] ?? FALLBACK;
              const active = cat.name === selectedId;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelect(cat.name)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors border-l-2 cursor-pointer
                    ${active
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                      : 'border-transparent text-slate-600 hover:bg-gray-50 hover:text-slate-800'}`}
                >
                  <Icon
                    size={14}
                    style={{ color: active ? '#f97316' : color }}
                    strokeWidth={1.8}
                    className="flex-shrink-0"
                  />
                  <span className="truncate leading-tight">{cat.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ── Mobile chip row ─────────────────────────────────────────────── */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
        <button
          onClick={() => onSelect('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer
            ${allActive
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-slate-700 border-gray-200 hover:border-orange-400'}`}
        >
          All
        </button>
        {categories.map((cat) => {
          const active = cat.name === selectedId;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer
                ${active
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-slate-700 border-gray-200 hover:border-orange-400'}`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </>
  );
}
