'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Mail, ArrowLeft, CheckCircle, ShoppingBag } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      // Don't leak whether email exists — show success anyway
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-neutral-900 p-8 text-white text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShoppingBag size={28} className="text-white" />
            </div>
            <h1 className="font-display tracking-tight text-2xl">Forgot Password?</h1>
            <p className="text-neutral-300 text-sm mt-1">
              {sent ? "Check your inbox" : "We'll send you a reset link"}
            </p>
          </div>

          <div className="p-8">
            {sent ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <h2 className="font-display tracking-tight text-lg text-neutral-900 mb-2">Email Sent!</h2>
                <p className="text-sm text-neutral-500 mb-6">
                  If <span className="font-semibold text-neutral-700">{email}</span> is registered,
                  you&apos;ll receive a password reset link shortly. Check your spam folder if you don&apos;t see it.
                </p>
                <Link href="/auth/login"
                  className="inline-flex items-center gap-2 text-neutral-900 hover:text-neutral-950 font-semibold transition-colors">
                  <ArrowLeft size={16} /> Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 text-sm px-4 py-3 rounded-xl mb-5">
                    {error}
                  </div>
                )}

                <p className="text-sm text-neutral-500 mb-5">
                  Enter the email address associated with your account and we&apos;ll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-semibold py-3.5 rounded-full transition-colors"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/auth/login"
                    className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-950 font-medium transition-colors">
                    <ArrowLeft size={14} /> Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
        <p className="text-center text-neutral-500 text-xs mt-4">© 2026 RNVS Inovative AI LLP</p>
      </div>
    </div>
  );
}
