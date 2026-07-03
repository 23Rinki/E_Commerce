'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShoppingBag, Shield, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function VendorPaymentPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, initAuth } = useAuthStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'paying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const hasInit = useRef(false);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) { router.replace('/auth/login?next=/vendor/payment'); return; }
    if (!user?.isVendor) {
      router.replace('/');
      return;
    }
  }, [isInitialized, isAuthenticated, user, router]);

  const handlePay = async () => {
    setStatus('loading');
    setErrorMsg('');

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setErrorMsg('Failed to load payment gateway. Check your internet connection.');
      setStatus('error');
      return;
    }

    try {
      const res = await fetch('/api/vendor/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorEmail: user?.email ?? '',
          storeName: user?.storeName ?? user?.email ?? '',
        }),
      });

      if (!res.ok) throw new Error('Failed to create payment order');
      const { orderId, amount, currency } = await res.json();

      setStatus('paying');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'RNVS CommerceX',
        description: 'Monthly Subscription — RNVS CommerceX',
        image: '',
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const verifyRes = await fetch('/api/vendor/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                vendorToken: token,
                vendorEmail: user?.email ?? '',
                vendorName: user?.firstName ?? '',
                storeName: user?.storeName ?? '',
              }),
            });

            if (verifyRes.ok) {
              setStatus('success');
            } else {
              setErrorMsg('Payment was received but verification failed. Please contact support with your payment ID: ' + response.razorpay_payment_id);
              setStatus('error');
            }
          } catch {
            setErrorMsg('Verification error. Please contact support.');
            setStatus('error');
          }
        },
        modal: {
          ondismiss: async () => {
            setStatus('idle');
            // Send failure email when modal is closed without payment
            await fetch('/api/vendor/payment-failed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vendorEmail: user?.email ?? '',
                vendorName: user?.firstName ?? '',
                storeName: user?.storeName ?? '',
              }),
            }).catch(() => {});
          },
        },
        prefill: {
          email: user?.email ?? '',
          name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
          contact: user?.phoneNumber ?? '',
        },
        theme: { color: '#f97316' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (resp: any) => {
        setStatus('error');
        setErrorMsg(`Payment failed: ${resp.error?.description ?? 'Unknown error'}. Code: ${resp.error?.code}`);
        await fetch('/api/vendor/payment-failed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorEmail: user?.email ?? '',
            vendorName: user?.firstName ?? '',
            storeName: user?.storeName ?? '',
          }),
        }).catch(() => {});
      });

      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (!isInitialized || !isAuthenticated) return null;

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-500 text-sm mb-1">₹2,999 introductory subscription received.</p>
          <p className="text-gray-500 text-sm mb-8">
            Your store is now <span className="text-green-600 font-semibold">Active</span>. A confirmation email has been sent to your inbox.
          </p>
          <button
            onClick={() => router.push('/vendor/dashboard')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Go to Seller Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <ShoppingBag size={20} className="text-orange-500" />
            <span className="font-black text-lg text-slate-900">RNVS <span className="text-orange-500">CommerceX</span></span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900">Activate Your Store</h1>
          <p className="text-gray-500 text-sm mt-1">Introductory offer — ₹2,999/month for first 3 months</p>
        </div>

        {/* Error banner */}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Payment card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Amount banner */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white text-center">
            <span className="inline-block bg-white/20 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              Introductory Offer
            </span>
            <div className="flex items-end justify-center gap-1">
              <p className="text-5xl font-black">₹2,999</p>
              <p className="text-base opacity-80 mb-1">/month</p>
            </div>
            <p className="text-sm opacity-90 mt-1 font-semibold">First 3 months</p>
            <p className="text-sm opacity-70 mt-0.5">Then ₹4,999/month · cancel anytime</p>
          </div>

          <div className="p-6">
            {/* What's included */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What's included</p>
            <ul className="space-y-2 mb-6">
              {[
                'Dedicated store database — fully isolated',
                'Unlimited product listings',
                'Order management & sales analytics',
                'Custom branding (logo, colors, fonts)',
                'Employee account management',
                'Ongoing priority support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={status === 'loading' || status === 'paying'}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
            >
              {status === 'loading' ? 'Preparing payment...' : status === 'paying' ? 'Complete in the popup...' : 'Pay ₹2,999 to Activate'}
            </button>

            <div className="flex items-center justify-center gap-2 mt-3">
              <Shield size={13} className="text-gray-400" />
              <p className="text-xs text-gray-400">Secured by Razorpay · UPI, Cards, Net Banking, Wallets</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Need help?{' '}
          <a href="mailto:support@rnvscommercex.com" className="underline">Contact support</a>
        </p>

        {/* Testing bypass */}
        <div className="mt-6 pt-4 border-t border-dashed border-gray-200 text-center">
          <p className="text-xs text-gray-400 mb-2">Testing only</p>
          <button
            onClick={async () => {
              const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/mark-vendor-paid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ paymentId: 'test-skip', orderId: 'test-skip' }),
              }).catch(() => {});
              setStatus('success');
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Skip payment for now
          </button>
        </div>
      </div>
    </div>
  );
}
