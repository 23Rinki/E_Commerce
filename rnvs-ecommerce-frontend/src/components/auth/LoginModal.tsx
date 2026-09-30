'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { authApi } from '@/lib/api';

type Tab = 'login' | 'register';

export default function LoginModal() {
  const router = useRouter();
  const { closeLoginModal, loginModalTab } = useUIStore();
  const { setAuth } = useAuthStore();

  const [tab, setTab] = useState<Tab>(loginModalTab);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phoneNumber: '',
  });

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLoginModal(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [closeLoginModal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(loginForm);
      const { token, user } = res.data;
      setAuth(user, token);
      closeLoginModal();
      const role = Number(user.role);
      if (role === 4 || role === 5) window.location.href = '/admin/vendors';
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirmPassword) { setError('Passwords do not match.'); return; }
    if (regForm.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res = await authApi.register({
        firstName: regForm.firstName,
        lastName: regForm.lastName,
        email: regForm.email,
        password: regForm.password,
        confirmPassword: regForm.confirmPassword,
        phoneNumber: regForm.phoneNumber || undefined,
      });
      const { token, user } = res.data;
      setAuth(user, token);
      closeLoginModal();
      window.location.reload();
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

  const inp = "w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-200 transition-colors";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) closeLoginModal(); }}
    >
      <div className="w-full max-w-[820px] bg-white rounded-2xl overflow-hidden shadow-2xl flex relative">

        {/* Close button */}
        <button
          onClick={closeLoginModal}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 hover:bg-neutral-100 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-colors shadow"
        >
          <X size={16} />
        </button>

        {/* ── Left panel — brand/promo ──────────────────────────────── */}
        <div
          className="hidden sm:flex flex-col justify-between w-[280px] flex-shrink-0 p-8 text-white"
          style={{ background: '#171717' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="h-8 w-8 rounded-full bg-white grid place-items-center text-neutral-900 font-display text-sm">R</div>
              <span className="font-display text-xl tracking-tight">RNVS CommerceX</span>
            </div>
            <h2 className="font-display tracking-tight text-2xl leading-snug mb-3">
              {tab === 'login' ? 'Welcome back!' : 'Join us today!'}
            </h2>
            <p className="text-neutral-300 text-sm leading-relaxed">
              {tab === 'login'
                ? 'Sign in to access your orders, wishlist and exclusive deals.'
                : 'Create an account to shop, track orders and unlock member-only prices.'}
            </p>
          </div>

          <div className="space-y-3 mt-8">
            {['10,000+ Products', 'Verified Sellers', 'Free Returns', '24/7 Support'].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-neutral-300">
                <CheckCircle2 size={15} className="text-white flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel — form ───────────────────────────────────── */}
        <div className="flex-1 p-8 overflow-y-auto max-h-[90vh]">
          {/* Tabs */}
          <div className="flex border-b border-neutral-200 mb-6">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'text-neutral-900 border-b-2 border-neutral-900'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {t === 'login' ? 'Login' : 'New? Create Account'}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* ── Login form ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Email</label>
                <input
                  type="email" required value={loginForm.email} autoComplete="off"
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="you@email.com" className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required value={loginForm.password} autoComplete="new-password"
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Enter your password" className={`${inp} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-semibold py-2.5 rounded-full transition-colors text-sm"
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
              <p className="text-center text-xs text-neutral-400">
                By continuing, you agree to our Terms of Use and Privacy Policy.
              </p>
            </form>
          )}

          {/* ── Register form ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3" autoComplete="off">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">First name</label>
                  <input type="text" required value={regForm.firstName} autoComplete="off"
                    onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Last name</label>
                  <input type="text" required value={regForm.lastName} autoComplete="off"
                    onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })} className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Email</label>
                <input type="email" required value={regForm.email} autoComplete="off"
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Mobile <span className="text-neutral-400 font-normal">(optional)</span></label>
                <input type="tel" value={regForm.phoneNumber} autoComplete="off"
                  onChange={(e) => setRegForm({ ...regForm, phoneNumber: e.target.value })}
                  placeholder="+91 98765 43210" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required value={regForm.password}
                    autoComplete="new-password" placeholder="Min. 8 characters"
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} className={`${inp} pr-10`} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Confirm password</label>
                <input type="password" required value={regForm.confirmPassword} autoComplete="new-password"
                  onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                  className={`${inp} ${regForm.confirmPassword && regForm.password !== regForm.confirmPassword ? 'border-amber-400' : regForm.confirmPassword && regForm.password === regForm.confirmPassword ? 'border-green-400' : ''}`}
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-semibold py-2.5 rounded-full transition-colors text-sm mt-1">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className="text-center text-xs text-neutral-400">
                By continuing, you agree to our Terms of Use and Privacy Policy.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
