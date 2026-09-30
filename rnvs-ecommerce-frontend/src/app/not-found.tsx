import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-24 lg:py-32 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Error 404</div>
        <h1 className="font-display text-5xl lg:text-7xl mt-4 tracking-tight text-neutral-900">Page not found.</h1>
        <p className="mt-5 text-neutral-500 max-w-md mx-auto">
          The page you&apos;re looking for may have moved, or the product is no longer available.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/products" className="inline-flex items-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 h-12 px-6 text-sm font-medium transition-colors">
            Browse products <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
          <Link href="/" className="inline-flex items-center rounded-full h-12 px-6 border border-neutral-300 text-sm font-medium hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
