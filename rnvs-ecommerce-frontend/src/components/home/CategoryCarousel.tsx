'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Category } from '@/types';
import { CATEGORY_ICON_MAP, CATEGORY_ICON_FALLBACK } from '@/lib/categoryIcons';

interface Props {
  categories: Category[];
  onSelect: (name: string) => void;
}

export default function CategoryCarousel({ categories, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 480, behavior: 'smooth' });

  if (categories.length === 0) return null;

  return (
    <section className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Shop by Category</div>
            <h2 className="font-display text-3xl lg:text-4xl mt-2 tracking-tight text-neutral-900">Browse categories</h2>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => scroll(-1)} className="h-11 w-11 rounded-full border border-neutral-200 grid place-items-center hover:bg-neutral-900 hover:text-white transition" aria-label="Scroll left">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => scroll(1)} className="h-11 w-11 rounded-full border border-neutral-200 grid place-items-center hover:bg-neutral-900 hover:text-white transition" aria-label="Scroll right">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={ref} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4">
          {categories.map((cat) => {
            const { Icon, color } = CATEGORY_ICON_MAP[cat.name] ?? CATEGORY_ICON_FALLBACK;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.name)}
                className="group snap-start shrink-0 w-[128px] text-center"
              >
                <div
                  className="aspect-square rounded-3xl bg-neutral-50 border border-neutral-100 grid place-items-center transition-all duration-300 group-hover:border-neutral-900 group-hover:-translate-y-1"
                >
                  <Icon className="h-8 w-8" style={{ color }} strokeWidth={1.6} />
                </div>
                <div className="mt-3 text-xs font-medium text-neutral-800 leading-snug line-clamp-2">{cat.name}</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
