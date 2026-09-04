'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, isInitialized, initAuth } = useAuthStore();

  const justLoggedIn = useRef(false);
  const hasAttempted  = useRef(false);

  const [returnUrl, setReturnUrl] = useState('/');
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setReturnUrl(p.get('returnUrl') || '/');
  }, []);

  useEffect(() => { initAuth(); }, []);
  useEffect(() => {
    if (isInitialized && isAuthenticated && !justLoggedIn.current && !hasAttempted.current) {
      router.replace(returnUrl || '/');
    }
  }, [isInitialized, isAuthenticated]);

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    hasAttempted.current = true;
    try {
      const res = await authApi.login(form);
      const { token, user } = res.data;
      justLoggedIn.current = true;
      setAuth(user, token);
      const role = Number(user.role);
      if (role === 4) window.location.href = '/admin/vendors';
      else router.push(returnUrl || '/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-800">
      {/* Backdrop image */}
      <img
        src="https://images.pexels.com/photos/10547927/pexels-photo-10547927.jpeg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-stone-900/55" />
      <div className="absolute inset-0 bg-gradient-to-tr from-stone-900/50 via-stone-800/40 to-stone-700/30" />

      {/* Top bar */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-20 text-white">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-white grid place-items-center text-neutral-900 font-display">R</div>
            <div className="font-display text-2xl tracking-tight">RNVS CommerceX</div>
          </Link>
          <Link href="/" className="text-white/90 hover:text-white inline-flex items-center gap-1.5 font-medium text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
        </div>
      </header>

      {/* Card */}
      <main className="relative z-10 flex items-center justify-center px-6 py-8 lg:py-14" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="w-full max-w-md rounded-[2rem] p-8 lg:p-10 border border-white/20 bg-stone-700/40 backdrop-blur-2xl text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/90 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Members Only
          </div>
          <h1 className="font-display text-5xl mt-3 leading-[1.05] text-white">Sign in.</h1>
          <p className="mt-3 text-white/85 text-sm">Your curated world awaits.</p>

          {error && (
            <div className="mt-5 px-4 py-3 bg-red-500/20 border border-red-400/40 text-red-100 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email address"
                className="w-full h-12 rounded-full pl-11 pr-4 bg-white/15 border border-white/25 text-white placeholder:text-white/65 text-sm outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/40 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                className="w-full h-12 rounded-full pl-11 pr-11 bg-white/15 border border-white/25 text-white placeholder:text-white/65 text-sm outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/40 transition-colors"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-white hover:text-white underline underline-offset-4">Forgot?</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 disabled:opacity-60 font-semibold inline-flex items-center justify-center group transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Continue'}
              {!loading && <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-white/85">
            New to RNVS CommerceX?{' '}
            <Link
              href={`/auth/register${returnUrl && returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="text-white font-semibold underline underline-offset-4"
            >
              Create account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
