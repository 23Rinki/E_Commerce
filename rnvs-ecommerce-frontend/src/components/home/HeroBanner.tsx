'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    label:    'Mobiles & Smartphones',
    heading:  'Latest Smartphones',
    sub:      'Top brands — unbeatable prices',
    cta:      'Shop Mobiles',
    href:     '/?category=Mobiles%20%26%20Smartphones',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%)',
    accent:   '#bfdbfe',
    emoji:    '📱',
  },
  {
    label:    'Home & Kitchen',
    heading:  'Kitchen Essentials',
    sub:      'Everything your home needs',
    cta:      'Shop Home',
    href:     '/?category=Home%20%26%20Kitchen',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #10b981 100%)',
    accent:   '#a7f3d0',
    emoji:    '🍳',
  },
  {
    label:    'Electronics',
    heading:  'Top Electronics',
    sub:      'TVs, cameras & smart devices',
    cta:      'Shop Electronics',
    href:     '/?category=Electronics',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #6d28d9 60%, #8b5cf6 100%)',
    accent:   '#ddd6fe',
    emoji:    '📺',
  },
  {
    label:    'Furniture & Decor',
    heading:  'Style Your Space',
    sub:      'Modern furniture at great prices',
    cta:      'Shop Furniture',
    href:     '/?category=Furniture%20%26%20Decor',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 60%, #f59e0b 100%)',
    accent:   '#fde68a',
    emoji:    '🪑',
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [paused,  setPaused]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (idx: number) =>
    setCurrent((idx + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused]);

  const slide = SLIDES[current];

  return (
    <section
      className="relative overflow-hidden select-none"
      style={{ background: slide.gradient, transition: 'background 0.5s ease' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 flex items-center justify-between gap-6 min-h-[200px]">

        {/* Left — text */}
        <div className="flex-1 min-w-0">
          <span
            className="inline-block text-[11px] font-bold uppercase tracking-widest rounded-full px-3 py-1 mb-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: slide.accent }}
          >
            {slide.label}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            {slide.heading}
          </h1>
          <p className="text-sm mt-2 mb-5" style={{ color: slide.accent }}>
            {slide.sub}
          </p>
          <Link
            href={slide.href}
            className="inline-flex items-center gap-2 font-bold px-6 py-2.5 rounded-full text-sm transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: slide.accent, color: '#1e293b' }}
          >
            {slide.cta} →
          </Link>
        </div>

        {/* Right — emoji + decorative ring */}
        <div className="hidden sm:flex flex-col items-center justify-center flex-shrink-0 relative">
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center text-6xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            {slide.emoji}
          </div>
          {/* outer ring */}
          <div
            className="absolute w-40 h-40 rounded-full border-2 opacity-30"
            style={{ borderColor: slide.accent }}
          />
        </div>

        {/* Prev / Next */}
        <button
          onClick={() => go(current - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>
        <button
          onClick={() => go(current + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={18} className="text-white" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className="rounded-full transition-all"
            style={{
              width:           i === current ? 20 : 6,
              height:          6,
              backgroundColor: i === current ? slide.accent : 'rgba(255,255,255,0.4)',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
