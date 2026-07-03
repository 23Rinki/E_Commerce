'use client';

import {
  Smartphone, Monitor, Home, Armchair, Shirt, Watch, Book,
  Dumbbell, Baby, Dog, Flower2, UtensilsCrossed, Heart, Car,
  Music, Briefcase, Camera, Tablet, Gem, ShoppingBag, Droplets,
  Leaf, Wrench, Package, Sparkles, Cpu, Layers, LayoutGrid,
} from 'lucide-react';
import { Category } from '@/types';

const ICON_MAP: Record<string, { Icon: React.ElementType; color: string }> = {
  'Electronics':            { Icon: Monitor,          color: '#6366f1' },
  'Mobiles & Smartphones':  { Icon: Smartphone,       color: '#2563eb' },
  'Computers & Laptops':    { Icon: Cpu,              color: '#0891b2' },
  'Tablets':                { Icon: Tablet,           color: '#7c3aed' },
  'Cameras & Photography':  { Icon: Camera,           color: '#b45309' },
  'Clothing & Apparel':     { Icon: Shirt,            color: '#db2777' },
  'Shoes & Footwear':       { Icon: Package,          color: '#7c2d12' },
  'Watches & Accessories':  { Icon: Watch,            color: '#0891b2' },
  'Jewellery':              { Icon: Gem,              color: '#9333ea' },
  'Bags & Luggage':         { Icon: ShoppingBag,      color: '#92400e' },
  'Home & Kitchen':         { Icon: Home,             color: '#059669' },
  'Furniture & Decor':      { Icon: Armchair,         color: '#d97706' },
  'Garden & Outdoors':      { Icon: Leaf,             color: '#16a34a' },
  'Tools & Hardware':       { Icon: Wrench,           color: '#64748b' },
  'Books & Stationery':     { Icon: Book,             color: '#4f46e5' },
  'Office Supplies':        { Icon: Briefcase,        color: '#475569' },
  'Sports & Fitness':       { Icon: Dumbbell,         color: '#ea580c' },
  'Baby & Kids':            { Icon: Baby,             color: '#f472b6' },
  'Toys & Games':           { Icon: Layers,           color: '#f59e0b' },
  'Pet Supplies':           { Icon: Dog,              color: '#78716c' },
  'Beauty & Personal Care': { Icon: Sparkles,         color: '#ec4899' },
  'Skincare':               { Icon: Droplets,         color: '#f9a8d4' },
  'Makeup & Cosmetics':     { Icon: Flower2,          color: '#e879f9' },
  'Hair Care':              { Icon: Sparkles,         color: '#c026d3' },
  'Fragrances':             { Icon: Flower2,          color: '#a21caf' },
  'Food & Beverages':       { Icon: UtensilsCrossed,  color: '#16a34a' },
  'Health & Wellness':      { Icon: Heart,            color: '#ef4444' },
  'Vitamins & Supplements': { Icon: Heart,            color: '#dc2626' },
  'Automotive':             { Icon: Car,              color: '#1d4ed8' },
  'Musical Instruments':    { Icon: Music,            color: '#7c3aed' },
};

const FALLBACK = { Icon: Package, color: '#94a3b8' };

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
