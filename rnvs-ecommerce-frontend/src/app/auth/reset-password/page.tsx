'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Lock, ArrowLeft, CheckCircle, ShoppingBag, AlertTriangle } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const linkInvalid = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, token, newPassword: password });
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: string[] } } };
      setError(
        e?.response?.data?.errors?.[0]
        || e?.response?.data?.message
        || 'This reset link is invalid or has expired. Please request a new one.',
      );
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
            <h1 className="font-display tracking-tight text-2xl">Reset Password</h1>
            <p className="text-neutral-300 text-sm mt-1">
              {done ? 'All set' : 'Choose a new password'}
            </p>
          </div>

          <div className="p-8">
            {linkInvalid ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} className="text-amber-500" />
                </div>
                <h2 className="font-display tracking-tight text-lg text-neutral-900 mb-2">Invalid Link</h2>
                <p className="text-sm text-neutral-500 mb-6">
                  This reset link is missing required information. Please request a new one.
                </p>
                <Link href="/auth/forgot-password"
                  className="inline-flex items-center gap-2 text-neutral-900 hover:text-neutral-950 font-semibold transition-colors">
                  <ArrowLeft size={16} /> Request a new link
                </Link>
              </div>
            ) : done ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <h2 className="font-display tracking-tight text-lg text-neutral-900 mb-2">Password Reset!</h2>
                <p className="text-sm text-neutral-500 mb-6">
                  Your password has been changed successfully. You can now sign in with your new password.
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
                  Resetting password for <span className="font-semibold text-neutral-700">{email}</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-semibold py-3.5 rounded-full transition-colors"
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
