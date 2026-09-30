'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  ArrowRight, Eye, EyeOff, Mail, Lock, User, Phone,
  ShieldCheck, Store,
} from 'lucide-react';
import AuthShell, { PasswordStrength } from '@/components/auth/AuthShell';

function GlassField({
  icon: Icon, label, right, ...props
}: { icon?: React.ElementType; label: string; right?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-white mb-1.5 block uppercase tracking-widest">{label}</label>
      <div className="relative">
        {Icon && <Icon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />}
        <input
          {...props}
          className={`w-full h-12 rounded-full ${Icon ? 'pl-11' : 'pl-4'} ${right ? 'pr-11' : 'pr-4'} bg-white/15 border border-white/25 text-white placeholder:text-white/65 text-sm outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/40 transition-colors`}
        />
        {right}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { setAuth, isAuthenticated, isInitialized, initAuth } = useAuthStore();

  const [tab, setTab] = useState<'customer' | 'seller'>('customer');
  const isSeller = tab === 'seller';

  const [returnUrl, setReturnUrl] = useState('/');
  useEffect(() => { setReturnUrl(search.get('returnUrl') || '/'); }, [search]);

  useEffect(() => { initAuth(); }, []);
  useEffect(() => {
    if (isInitialized && isAuthenticated) router.replace('/');
  }, [isAuthenticated, isInitialized, router]);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phoneNumber: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) { setError('Please agree to the Terms and Privacy Policy to continue.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
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
        const errs = Array.isArray(data.errors) ? data.errors : Object.values(data.errors as Record<string, string[]>).flat();
        if (errs.length > 0) msg = (errs as string[]).join(' ');
      } else if (data?.message) msg = data.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      image={isSeller
        ? 'https://images.pexels.com/photos/12277013/pexels-photo-12277013.jpeg'
        : 'https://images.pexels.com/photos/7671167/pexels-photo-7671167.jpeg'}
      size="lg"
      eyebrow={isSeller ? 'Sell on RNVS' : 'Create account'}
      title={isSeller ? 'Register your brand.' : 'Create your account.'}
      subtitle={isSeller
        ? 'Reach real shoppers on RNVS CommerceX — free to get started.'
        : 'Shop, track orders and unlock member-only prices.'}
      topRight={
        <Link href="/auth/login" className="text-white/90 hover:text-white hidden sm:inline font-medium">
          Have an account? <span className="underline underline-offset-4">Sign in</span>
        </Link>
      }
    >
      {/* Tabs */}
      <div className="mt-6 grid grid-cols-2 gap-1.5 rounded-full bg-stone-900/30 border border-white/20 p-1.5 backdrop-blur">
        {[
          { id: 'customer', label: 'Customer', icon: User },
          { id: 'seller',   label: 'Seller',   icon: Store },
        ].map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id as 'customer' | 'seller')}
            className={`h-9 rounded-full text-xs font-semibold transition inline-flex items-center justify-center gap-2 ${tab === t.id ? 'bg-white text-neutral-900' : 'text-white/80 hover:text-white'}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {isSeller ? (
        /* Seller: link out to the real 6-step onboarding flow */
        <div className="mt-6">
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 text-sm text-white/90 leading-relaxed">
            Seller registration collects your store details, Udyam certificate, PAN and GST as part of a guided
            setup — that happens on our dedicated seller onboarding page.
          </div>
          <Link
            href="/sell"
            className="mt-4 w-full h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 font-semibold inline-flex items-center justify-center group transition-colors"
          >
            Continue to seller registration
            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mt-5 px-4 py-3 bg-red-500/20 border border-red-400/40 text-red-100 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <GlassField icon={User} label="First name" required value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Priya" />
              <GlassField icon={User} label="Last name" required value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Sharma" />
            </div>
            <GlassField icon={Mail} label="Email address" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@domain.com" />
            <GlassField icon={Phone} label="Phone (optional)" value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+91 98765 43210" />

            <div>
              <label className="text-[11px] font-semibold text-white mb-1.5 block uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Create a strong password"
                  className="w-full h-12 rounded-full pl-11 pr-11 bg-white/15 border border-white/25 text-white placeholder:text-white/65 text-sm outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/40 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength value={form.password} />
            </div>

            <GlassField icon={Lock} label="Confirm password" type="password" required value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Re-enter password" />

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/50 bg-white/15 accent-white"
              />
              <span className="text-sm text-white">
                I agree to RNVS CommerceX&rsquo;s{' '}
                <Link href="/terms" className="underline underline-offset-4">Terms</Link>
                {' '}&{' '}
                <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 disabled:opacity-60 font-semibold mt-2 inline-flex items-center justify-center group transition-colors"
            >
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>
        </>
      )}

      <div className="mt-6 text-center text-sm text-white/85">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-white font-semibold underline underline-offset-4">Sign in</Link>
      </div>

      <div className="mt-6 pt-5 border-t border-white/15 text-[11px] text-white/75 inline-flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Secure, encrypted sign-up
      </div>
    </AuthShell>
  );
}
