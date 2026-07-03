'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, isInitialized, initAuth } = useAuthStore();

  const [returnUrl, setReturnUrl] = useState('/products');
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setReturnUrl(p.get('returnUrl') || '/');
  }, []);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isInitialized && isAuthenticated) router.replace('/');
  }, [isAuthenticated, isInitialized, router]);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '', phoneNumber: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        phoneNumber: form.phoneNumber || undefined,
      });
      const { token, user } = res.data;
      setAuth(user, token);
      router.push(returnUrl);
    } catch (err: any) {
      const data = err?.response?.data;
      let msg = 'Registration failed. Please try again.';
      if (data?.errors) {
        const errs = Array.isArray(data.errors)
          ? data.errors
          : Object.values(data.errors as Record<string, string[]>).flat();
        if (errs.length > 0) msg = errs.join(' ');
      } else if (data?.message) {
        msg = data.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full px-3 py-2 border border-gray-400 rounded focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 text-sm";
  const lbl = "block text-sm font-semibold text-slate-800 mb-1";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center pt-8 px-4 pb-12">

      {/* Back to home */}
      <div className="w-full max-w-sm mb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors">
          <ArrowLeft size={15} /> Back to Home
        </Link>
      </div>

      {/* Logo */}
      <Link href="/" className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">RNVS</span>
          <span className="text-3xl font-black text-orange-500 tracking-tight">CommerceX</span>
        </div>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm border border-gray-300 rounded-lg px-7 py-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-5">Create account</h1>

        {error && (
          <div className="bg-amber-50 border border-amber-400 text-amber-900 text-sm px-3 py-2.5 rounded mb-4">
            <span className="font-semibold">There was a problem.</span>
            <br />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>First name</label>
              <input type="text" required value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                autoComplete="off" className={inp} />
            </div>
            <div>
              <label className={lbl}>Last name</label>
              <input type="text" required value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                autoComplete="off" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Email</label>
            <input type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="off" className={inp} />
          </div>

          <div>
            <label className={lbl}>Mobile number <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="tel" value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="+91 98765 43210" autoComplete="off" className={inp} />
          </div>

          <div>
            <label className={lbl}>Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters" autoComplete="new-password"
                className={`${inp} pr-10`} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Passwords must be at least 8 characters.</p>
          </div>

          <div>
            <label className={lbl}>Re-enter password</label>
            <input type="password" required value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              autoComplete="new-password"
              className={`${inp} ${
                form.confirmPassword && form.password !== form.confirmPassword
                  ? 'border-amber-500 focus:border-amber-500 focus:ring-amber-100'
                  : form.confirmPassword && form.password === form.confirmPassword
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-100'
                  : ''
              }`} />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-amber-700 mt-1">Passwords must match.</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-slate-900 font-semibold text-sm py-2 rounded border border-yellow-500 hover:border-yellow-600 transition-colors shadow-sm mt-2">
            {loading ? 'Creating account...' : 'Continue'}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          By creating an account, you agree to RNVS CommerceX&apos;s{' '}
          <Link href="#" className="text-blue-600 hover:underline">Conditions of Use</Link>
          {' '}and{' '}
          <Link href="#" className="text-blue-600 hover:underline">Privacy Notice</Link>.
        </p>
      </div>

      {/* Sign in link */}
      <div className="w-full max-w-sm mt-4 text-sm text-slate-700">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
          Sign in
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-12 border-t border-gray-200 w-full flex justify-center gap-5 pt-4 pb-4">
        <Link href="#" className="text-xs text-blue-600 hover:underline">Conditions of Use</Link>
        <Link href="#" className="text-xs text-blue-600 hover:underline">Privacy Notice</Link>
        <Link href="#" className="text-xs text-blue-600 hover:underline">Help</Link>
      </div>
      <p className="text-xs text-gray-500">© 2026 RNVS Inovative AI LLP</p>
    </div>
  );
}
