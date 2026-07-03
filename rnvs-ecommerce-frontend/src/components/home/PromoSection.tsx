import Link from 'next/link';

export default function PromoSection() {
  return (
    <section className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Card 1 — Flash Sale (orange) */}
          <div className="md:col-span-1">
            <div
              className="rounded-2xl p-8 min-h-[220px] flex flex-col justify-between relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
            >
              {/* Decorative circles */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 160,
                  height: 160,
                  top: -40,
                  right: -40,
                  background: 'rgba(255,255,255,0.12)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: 100,
                  height: 100,
                  bottom: -30,
                  left: -20,
                  background: 'rgba(255,255,255,0.08)',
                }}
              />

              <div className="relative">
                <p className="text-white/80 text-xs font-bold tracking-widest uppercase mb-2">
                  Limited Time
                </p>
                <h3 className="text-white text-2xl font-black">Flash Sale</h3>
                <p className="text-white/80 text-sm mt-2">
                  Up to 70% off on Electronics &amp; Fashion
                </p>
              </div>

              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-1 bg-white text-orange-600 font-bold text-xs px-5 py-2.5 rounded-full hover:bg-orange-50 transition-colors self-start relative"
              >
                Shop Deals →
              </Link>
            </div>
          </div>

          {/* Card 2 — New Arrivals (indigo) */}
          <div className="md:col-span-1">
            <div
              className="rounded-2xl p-8 min-h-[220px] flex flex-col justify-between relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}
            >
              {/* Decorative circles */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 140,
                  height: 140,
                  top: -30,
                  right: -30,
                  background: 'rgba(255,255,255,0.10)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: 90,
                  height: 90,
                  bottom: -20,
                  left: -15,
                  background: 'rgba(255,255,255,0.06)',
                }}
              />

              <div className="relative">
                <p className="text-indigo-200 text-xs font-bold tracking-widest uppercase mb-2">
                  Just Landed
                </p>
                <h3 className="text-white text-2xl font-black">New Arrivals</h3>
                <p className="text-indigo-200 text-sm mt-2">
                  Fresh drops every week from top brands
                </p>
              </div>

              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-1 bg-white text-indigo-600 font-bold text-xs px-5 py-2.5 rounded-full hover:bg-indigo-50 transition-colors self-start relative"
              >
                Explore Now →
              </Link>
            </div>
          </div>

          {/* Card 3 — Sell with Us (dark) */}
          <div className="md:col-span-1">
            <div
              className="rounded-2xl p-8 min-h-[220px] flex flex-col justify-between relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
            >
              {/* Decorative circles */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 150,
                  height: 150,
                  top: -40,
                  right: -40,
                  background: 'rgba(255,255,255,0.05)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: 80,
                  height: 80,
                  bottom: -20,
                  left: -10,
                  background: 'rgba(249,115,22,0.15)',
                }}
              />

              <div className="relative">
                <p className="text-orange-400 text-xs font-bold tracking-widest uppercase mb-2">
                  For Sellers
                </p>
                <h3 className="text-white text-2xl font-black">Grow Your Business</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Join 500+ verified sellers on our platform
                </p>
              </div>

              <Link
                href="/auth/register"
                className="mt-6 inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-colors self-start relative"
              >
                Start Selling →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
