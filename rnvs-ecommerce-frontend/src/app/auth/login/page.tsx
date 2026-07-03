'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight">RNVS</span>
            <span className="text-2xl font-black text-orange-500 tracking-tight">CommerceX</span>
          </Link>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-8">

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors mt-1"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 border-t border-gray-100 pt-5">
            <p className="text-center text-sm text-gray-500 mb-3">New to RNVS CommerceX?</p>
            <Link
              href={`/auth/register${returnUrl && returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="block w-full text-center py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
            >
              Create your account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
