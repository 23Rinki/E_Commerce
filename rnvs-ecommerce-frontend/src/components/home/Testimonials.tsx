import { Star } from 'lucide-react';

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Verified buyer', rating: 5,
    text: 'The packaging alone made me feel like I was unboxing a gift to myself.' },
  { name: 'Aarav M.', role: 'Verified buyer', rating: 5,
    text: 'Fast delivery and the product matched the listing exactly. Will order again.' },
  { name: 'Kavya R.', role: 'Verified buyer', rating: 5,
    text: 'Great prices and the return process was genuinely hassle-free.' },
];

export default function Testimonials() {
  return (
    <section className="py-14 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Reviews</div>
          <h2 className="font-display text-3xl lg:text-4xl mt-2 tracking-tight text-neutral-900">What shoppers say</h2>
        </div>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="rounded-3xl border border-neutral-100 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-20px_rgba(0,0,0,0.15)] transition-shadow">
              <div className="flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-neutral-900 text-neutral-900" />
                ))}
              </div>
              <blockquote className="mt-4 font-display text-xl leading-snug text-neutral-900">&ldquo;{t.text}&rdquo;</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-100 grid place-items-center text-neutral-700 text-sm font-semibold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900">{t.name}</div>
                  <div className="text-xs text-neutral-500">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
