'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Lock, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import AuthShell, { authInputCls, authButtonCls, AuthError, PasswordStrength, meetsPasswordPolicy } from '@/components/auth/AuthShell';

const IMAGE = 'https://images.pexels.com/photos/10547927/pexels-photo-10547927.jpeg';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const linkInvalid = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!meetsPasswordPolicy(password)) {
      setError('Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.');
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

  if (linkInvalid) {
    return (
      <AuthShell image={IMAGE} eyebrow="Account recovery" title="Link not valid." subtitle="This reset link is incomplete or has already been used. Request a fresh one and use it within its expiry time.">
        <div className="mt-8 h-14 w-14 rounded-full bg-white/15 border border-white/25 grid place-items-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <Link href="/auth/forgot-password" className={`${authButtonCls} mt-8`}>
          Request a new link <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell image={IMAGE} eyebrow="All set" title="Password updated." subtitle="You can now sign in with your new password.">
        <div className="mt-8 h-14 w-14 rounded-full bg-white/15 border border-white/25 grid place-items-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <Link href="/auth/login" className={`${authButtonCls} mt-8`}>
          Continue to sign in <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      image={IMAGE}
      eyebrow="Account recovery"
      title="Set a new password."
      subtitle={<>For <span className="font-semibold text-white">{email}</span></>}
    >
      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <div className="relative">
            <Lock className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
            <input
              type={showPass ? 'text' : 'password'}
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              aria-label="New password"
              className={`${authInputCls} pr-11`}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength value={password} />
        </div>
        <div className="relative">
          <Lock className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            type={showPass ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            aria-label="Confirm new password"
            className={authInputCls}
          />
        </div>
        <button type="submit" disabled={loading} className={`${authButtonCls} mt-2`}>
          {loading ? 'Updating…' : 'Update password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
