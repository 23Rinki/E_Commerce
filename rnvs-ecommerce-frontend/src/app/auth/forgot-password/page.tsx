'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Mail, ArrowLeft, ArrowRight, MailCheck } from 'lucide-react';
import AuthShell, { authInputCls, authButtonCls } from '@/components/auth/AuthShell';

const IMAGE = 'https://images.pexels.com/photos/10547927/pexels-photo-10547927.jpeg';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      // Don't leak whether the email exists — show the same confirmation either way
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell image={IMAGE} eyebrow="Check your inbox" title="Link sent." subtitle={
        <>If <span className="font-semibold text-white">{email}</span> has an account, a password reset link is on its way. It can take a minute — check your spam folder too.</>
      }>
        <div className="mt-8 h-14 w-14 rounded-full bg-white/15 border border-white/25 grid place-items-center">
          <MailCheck className="h-6 w-6" />
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/auth/login" className={authButtonCls}>
            Back to sign in <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button type="button" onClick={() => setSent(false)} className="text-sm text-white/85 hover:text-white underline underline-offset-4">
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      image={IMAGE}
      eyebrow="Account recovery"
      title="Forgot password?"
      subtitle="Enter the email you signed up with and we'll send you a link to set a new one."
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="relative">
          <Mail className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            className={authInputCls}
          />
        </div>
        <button type="submit" disabled={loading} className={`${authButtonCls} mt-2`}>
          {loading ? 'Sending…' : 'Send reset link'}
          {!loading && <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
