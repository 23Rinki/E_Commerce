'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative rounded-[2rem] overflow-hidden bg-neutral-900 text-white p-10 lg:p-16">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-neutral-300">Stay Updated</div>
              <h3 className="font-display text-3xl lg:text-5xl mt-3">Never miss a deal</h3>
              <p className="mt-4 text-neutral-300 max-w-md">
                Join thousands of smart shoppers getting exclusive deals and new arrivals every week.
              </p>
            </div>

            {submitted ? (
              <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500/30 px-8 py-4 rounded-2xl font-semibold text-sm w-fit">
                <Check size={16} />
                You&apos;re in! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  required
                  className="h-14 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-neutral-400 px-6 flex-1 outline-none focus:border-white/40 transition-colors"
                />
                <button
                  type="submit"
                  className="h-14 rounded-full bg-white text-neutral-900 hover:bg-neutral-100 px-8 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors flex-shrink-0"
                >
                  Subscribe <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
