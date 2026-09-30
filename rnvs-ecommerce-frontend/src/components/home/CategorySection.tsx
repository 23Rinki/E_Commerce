'use client';

import Link from 'next/link';
import {
  Smartphone, Monitor, Home, Armchair, Zap, Shirt, Watch, Book,
  Dumbbell, Baby, Dog, Flower2, UtensilsCrossed, Heart, Car,
  Music, Briefcase, Camera, Tablet, Gem, ShoppingBag, Droplets,
  Leaf, Wrench, Package, Sparkles, Cpu, Layers,
} from 'lucide-react';
import { Category } from '@/types';

const ICON_MAP: Record<string, { Icon: React.ElementType; color: string }> = {
  'Electronics':            { Icon: Monitor,        color: '#6366f1' },
  'Mobiles & Smartphones':  { Icon: Smartphone,     color: '#2563eb' },
  'Computers & Laptops':    { Icon: Cpu,            color: '#0891b2' },
  'Tablets':                { Icon: Tablet,         color: '#7c3aed' },
  'Cameras & Photography':  { Icon: Camera,         color: '#b45309' },
  'Clothing & Apparel':     { Icon: Shirt,          color: '#db2777' },
  'Shoes & Footwear':       { Icon: Package,        color: '#7c2d12' },
  'Watches & Accessories':  { Icon: Watch,          color: '#0891b2' },
  'Jewellery':              { Icon: Gem,            color: '#9333ea' },
  'Bags & Luggage':         { Icon: ShoppingBag,    color: '#92400e' },
  'Home & Kitchen':         { Icon: Home,           color: '#059669' },
  'Furniture & Decor':      { Icon: Armchair,       color: '#d97706' },
  'Garden & Outdoors':      { Icon: Leaf,           color: '#16a34a' },
  'Tools & Hardware':       { Icon: Wrench,         color: '#64748b' },
  'Books & Stationery':     { Icon: Book,           color: '#4f46e5' },
  'Office Supplies':        { Icon: Briefcase,      color: '#475569' },
  'Sports & Fitness':       { Icon: Dumbbell,       color: '#ea580c' },
  'Baby & Kids':            { Icon: Baby,           color: '#f472b6' },
  'Toys & Games':           { Icon: Layers,         color: '#f59e0b' },
  'Pet Supplies':           { Icon: Dog,            color: '#78716c' },
  'Beauty & Personal Care': { Icon: Sparkles,       color: '#ec4899' },
  'Skincare':               { Icon: Droplets,       color: '#f9a8d4' },
  'Makeup & Cosmetics':     { Icon: Flower2,        color: '#e879f9' },
  'Hair Care':              { Icon: Sparkles,       color: '#c026d3' },
  'Fragrances':             { Icon: Flower2,        color: '#a21caf' },
  'Food & Beverages':       { Icon: UtensilsCrossed,color: '#16a34a' },
  'Health & Wellness':      { Icon: Heart,          color: '#ef4444' },
  'Vitamins & Supplements': { Icon: Heart,          color: '#dc2626' },
  'Automotive':             { Icon: Car,            color: '#1d4ed8' },
  'Musical Instruments':    { Icon: Music,          color: '#7c3aed' },
  'Appliances':             { Icon: Zap,            color: '#dc2626' },
  'Miscellaneous':          { Icon: Package,        color: '#94a3b8' },
};

const FALLBACK = { Icon: Package, color: '#94a3b8' };

interface Props { categories: Category[]; }

export default function CategorySection({ categories }: Props) {
  if (!categories.length) return null;

  return (
    <div className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex overflow-x-auto scrollbar-hide">
          {categories.map((cat) => {
            const { Icon, color } = ICON_MAP[cat.name] ?? FALLBACK;
            return (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className="flex flex-col items-center gap-1.5 px-4 py-3 flex-shrink-0 group hover:bg-neutral-50 transition-colors border-b-2 border-transparent hover:border-neutral-900"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon size={17} style={{ color }} strokeWidth={1.8} />
                </div>
                <span className="text-[11px] text-neutral-600 group-hover:text-neutral-950 font-medium whitespace-nowrap leading-tight text-center transition-colors">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
