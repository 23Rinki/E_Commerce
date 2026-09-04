'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main hero */}
          <div className="lg:col-span-8 relative rounded-3xl overflow-hidden bg-neutral-100 min-h-[380px] lg:min-h-[480px] group">
            <img
              src="https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg"
              alt="Shop the latest collection"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1600ms] group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
            <div className="absolute inset-0 p-8 lg:p-14 flex flex-col justify-end text-white max-w-xl fade-up">
              <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase opacity-90">
                <span className="h-px w-8 bg-white/70" /> Featured this week
              </div>
              <h1 className="font-display text-4xl lg:text-6xl leading-[1.05] mt-4">
                Shop smart.<br />Save more.
              </h1>
              <p className="mt-4 text-white/90 max-w-md text-base lg:text-lg">
                Quality products from trusted vendors, at prices you&apos;ll love. Free shipping on orders above ₹1,999.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center rounded-full bg-white text-neutral-900 hover:bg-neutral-100 h-12 px-6 text-sm font-medium transition-colors"
                >
                  Shop now <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div>
            </div>
          </div>

          {/* Side stack */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Link href="/products" className="relative rounded-3xl overflow-hidden min-h-[180px] lg:min-h-[228px] group">
              <img
                src="https://images.pexels.com/photos/3201768/pexels-photo-3201768.jpeg"
                alt="Tech deals"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="relative h-full p-6 flex flex-col justify-end text-white">
                <div className="text-[11px] uppercase tracking-widest opacity-80">Just Landed</div>
                <div className="font-display text-2xl mt-1">Tech &amp; Electronics</div>
                <div className="mt-2 text-sm inline-flex items-center gap-1">Explore <ArrowRight className="h-4 w-4" /></div>
              </div>
            </Link>
            <Link href="/sell" className="relative rounded-3xl overflow-hidden min-h-[180px] lg:min-h-[228px] group bg-neutral-900">
              <img
                src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg"
                alt="Sell with us"
                className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="relative h-full p-6 flex flex-col justify-end text-white">
                <div className="text-[11px] uppercase tracking-widest opacity-80">For Sellers</div>
                <div className="font-display text-2xl mt-1">Grow your business</div>
                <div className="mt-2 text-sm inline-flex items-center gap-1">Start selling <ArrowRight className="h-4 w-4" /></div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
