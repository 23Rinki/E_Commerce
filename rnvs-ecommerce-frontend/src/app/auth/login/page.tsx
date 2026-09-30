'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import AuthShell, { authInputCls, authButtonCls, AuthError } from '@/components/auth/AuthShell';

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
      // Admin (4) and SuperAdmin (5) land in the admin panel; sellers in their dashboard unless
      // they were sent here from a specific page
      const role = Number(user.role);
      if (role === 4 || role === 5) window.location.href = '/admin/vendors';
      else if (role === 2 && (!returnUrl || returnUrl === '/')) router.push('/vendor/dashboard');
      else router.push(returnUrl || '/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      image="https://images.pexels.com/photos/10547927/pexels-photo-10547927.jpeg"
      eyebrow="Members only"
      title="Sign in."
      subtitle="Your curated world awaits."
    >
      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="relative">
          <Mail className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email address"
            aria-label="Email address"
            className={authInputCls}
          />
        </div>
        <div className="relative">
          <Lock className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            type={showPass ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password"
            aria-label="Password"
            className={`${authInputCls} pr-11`}
          />
          <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-end">
          <Link href="/auth/forgot-password" className="text-sm text-white hover:text-white underline underline-offset-4">Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading} className={`${authButtonCls} mt-2`}>
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
      <div className="mt-6 pt-5 border-t border-white/15 text-center text-xs text-white/75">
        Want to sell with us?{' '}
        <Link href="/sell" className="text-white font-medium underline underline-offset-4">Open a store</Link>
      </div>
    </AuthShell>
  );
}
