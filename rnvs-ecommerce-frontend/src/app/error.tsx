'use client';

import Link from 'next/link';
import { RotateCw } from 'lucide-react';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-24 lg:py-32 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Something went wrong</div>
        <h1 className="font-display text-5xl lg:text-7xl mt-4 tracking-tight text-neutral-900">We couldn&apos;t load this.</h1>
        <p className="mt-5 text-neutral-500 max-w-md mx-auto">
          The store is having trouble reaching its servers. Please try again in a moment.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="inline-flex items-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 h-12 px-6 text-sm font-medium transition-colors">
            <RotateCw className="h-4 w-4 mr-2" /> Try again
          </button>
          <Link href="/" className="inline-flex items-center rounded-full h-12 px-6 border border-neutral-300 text-sm font-medium hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
