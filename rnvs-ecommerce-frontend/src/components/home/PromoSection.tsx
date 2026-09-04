import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PromoSection() {
  return (
    <section className="py-14 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-6">
        <Link href="/products" className="relative rounded-3xl overflow-hidden min-h-[320px] group bg-neutral-100">
          <img
            src="https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg"
            alt="Flash sale"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/15 to-transparent" />
          <div className="absolute inset-0 p-8 lg:p-12 flex flex-col justify-end text-white">
            <div className="text-[11px] uppercase tracking-[0.3em] opacity-80">Limited Time</div>
            <h3 className="font-display text-3xl lg:text-4xl mt-3">Flash Sale</h3>
            <p className="mt-2 max-w-md text-white/90 text-sm">Up to 70% off across Electronics &amp; Fashion.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
              Shop deals <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link href="/sell" className="relative rounded-3xl overflow-hidden min-h-[320px] group bg-neutral-900">
          <img
            src="https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg"
            alt="Sell with us"
            className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-[1200ms] group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/25 to-transparent" />
          <div className="absolute inset-0 p-8 lg:p-12 flex flex-col justify-end text-white">
            <div className="text-[11px] uppercase tracking-[0.3em] opacity-80">For Sellers</div>
            <h3 className="font-display text-3xl lg:text-4xl mt-3">Grow your business</h3>
            <p className="mt-2 max-w-md text-white/90 text-sm">Join our verified sellers on the platform — free to start.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
              Start selling <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
