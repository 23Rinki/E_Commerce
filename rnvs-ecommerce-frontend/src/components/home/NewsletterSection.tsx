'use client';

import { useState } from 'react';
import { Mail, Send, Check } from 'lucide-react';

export default function NewsletterSection() {
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }

  return (
    <section
      className="py-16"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <div className="max-w-4xl mx-auto px-4 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-4 py-1.5 text-xs font-bold mb-4">
          <Mail size={12} />
          Stay Updated
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-black text-white mb-3">
          Never Miss a Deal
        </h2>
        <p className="text-gray-400 text-sm mb-8">
          Join 50,000+ smart shoppers getting exclusive deals every week.
        </p>

        {/* Success or Form */}
        {submitted ? (
          <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500/30 px-8 py-4 rounded-2xl font-semibold text-sm">
            <Check size={16} />
            You&apos;re in! Check your inbox.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-5 py-3.5 text-sm outline-none focus:border-orange-500 transition-colors"
            />
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-all flex-shrink-0 flex items-center gap-2"
            >
              <Send size={14} />
              Subscribe
            </button>
          </form>
        )}

        <p className="text-gray-600 text-xs mt-4">
          No spam, ever. Unsubscribe anytime.
        </p>

      </div>
    </section>
  );
}
