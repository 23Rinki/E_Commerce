'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store, ChevronRight, ChevronLeft,
  CheckCircle2, ShoppingBag, TrendingUp, Shield, Eye, EyeOff, AlertTriangle, FileText,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

declare global {
  interface Window { Razorpay: any; }
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

// Step 0 = Account, 1 = Store, 2 = Terms, 3 = Business Details, 4 = Payment, 5 = Done
const STEPS = ['Acct', 'Store', 'Terms', 'Biz', 'Pay'];

const inp = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 transition-colors';

export default function BecomeSellerPage() {
  const router = useRouter();
  const { setAuth, user, isInitialized } = useAuthStore();

  const [step, setStep] = useState(0);

  // If already logged in, skip or redirect
  useEffect(() => {
    if (!isInitialized) return;
    if (!user) return;
    // Already a vendor — send them straight to their dashboard
    if (Number(user.role) === 2) {
      router.replace('/vendor/dashboard');
      return;
    }
    // Logged in as customer/admin — skip account creation, pre-fill known details
    setForm(f => ({
      ...f,
      firstName: user.firstName ?? '',
      lastName:  user.lastName  ?? '',
      email:     user.email     ?? '',
    }));
    setStep(1);
  }, [isInitialized, user]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');
  const [payError, setPayError] = useState('');
  const [vendorToken, setVendorToken] = useState('');

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    udyam: '',
    pan: '',
    gst: '',
    plan: 'monthly',
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validateStep0 = () => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email.';
    if (form.phone.trim() && !/^[6-9]\d{9}$/.test(form.phone.replace(/\s+/g, '').replace(/^\+91/, '')))
      return 'Enter a valid 10-digit Indian mobile number.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (!/\d/.test(form.password)) return 'Password must contain at least one digit (0–9).';
    if (!/[^a-zA-Z0-9]/.test(form.password)) return 'Password must contain at least one special character (e.g. @, #, !).';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const validateStep1 = () => {
    if (!form.storeName.trim()) return 'Store name is required.';
    return '';
  };

  const validateStep3 = () => {
    if (!form.pan.trim())
      return 'Company / Proprietor PAN Card Number is required.';

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.pan.trim()))
      return 'Invalid PAN number. It must be 10 characters — e.g. ABCDE1234F';

    if (form.udyam.trim() && !/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i.test(form.udyam.trim()))
      return 'Invalid Udyam number. Format: UDYAM-MH-02-0012345';

    if (form.gst.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(form.gst.trim()))
      return 'Invalid GSTIN format. Example: 27ABCDE1234F1Z5';

    return '';
  };

  const handleNext = () => {
    setError('');
    const validators: Record<number, () => string> = {
      0: validateStep0,
      1: validateStep1,
    };
    const validate = validators[step];
    if (validate) {
      const err = validate();
      if (err) { setError(err); return; }
    }
    setStep((s) => s + 1);
  };

  // Called at the end of step 3 — registers vendor and moves to payment
  const handleRegisterAndProceed = async () => {
    setError('');
    const err = validateStep3();
    if (err) { setError(err); return; }

    // If already logged in, skip registration and go straight to payment
    if (user) {
      setStep(4);
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
        phoneNumber: form.phone || undefined,
        role: 2,
        storeName: form.storeName,
        udyamCertificateNumber: form.udyam.toUpperCase().trim(),
        companyPanNumber: form.pan.toUpperCase().trim(),
        gstNumber: form.gst.toUpperCase().trim() || undefined,
      });

      const { token, user } = res.data;
      setAuth(user, token);
      setVendorToken(token);

      // Send payment link email — fire and forget
      fetch('/api/vendor/send-payment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorEmail: form.email,
          vendorName: form.firstName,
          storeName: form.storeName,
        }),
      })
        .then(r => r.json())
        .then(d => { if (!d.success) console.error('[sell] email failed:', d); })
        .catch(e => console.error('[sell] email error:', e));

      setStep(4); // Go to Payment
    } catch (err: any) {
      const data = err?.response?.data;
      let msg = 'Registration failed. Please try again.';
      if (data?.errors) {
        const errs = Array.isArray(data.errors)
          ? data.errors
          : Object.values(data.errors as Record<string, string[]>).flat();
        if (errs.length > 0) msg = (errs as string[]).join(' ');
      } else if (data?.message) msg = data.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setPayError('');
    setPayLoading(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPayError('Failed to load payment gateway. Please check your internet connection.');
      setPayLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/vendor/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorEmail: form.email, storeName: form.storeName, plan: form.plan }),
      });
      if (!res.ok) throw new Error('Could not create payment order');
      const { orderId, amount, currency } = await res.json();
      setPayLoading(false);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'RNVS CommerceX',
        description: 'Monthly Subscription — RNVS CommerceX',
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const token = vendorToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            const verifyRes = await fetch('/api/vendor/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                vendorToken: token,
                vendorEmail: form.email,
                vendorName: form.firstName,
                storeName: form.storeName,
                plan: form.plan,
              }),
            });
            if (verifyRes.ok) {
              setStep(5); // Done
            } else {
              setPayError('Payment received but verification failed. Contact support with payment ID: ' + response.razorpay_payment_id);
            }
          } catch {
            setPayError('Verification error. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            fetch('/api/vendor/payment-failed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vendorEmail: form.email, vendorName: form.firstName, storeName: form.storeName }),
            }).catch(() => {});
          },
        },
        prefill: {
          email: form.email,
          name: `${form.firstName} ${form.lastName}`.trim(),
          contact: form.phone,
        },
        theme: { color: '#f97316' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (resp: any) => {
        setPayError(`Payment failed: ${resp.error?.description ?? 'Unknown error'}`);
        fetch('/api/vendor/payment-failed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorEmail: form.email, vendorName: form.firstName, storeName: form.storeName }),
        }).catch(() => {});
      });

      rzp.open();
    } catch (err: any) {
      setPayError(err.message ?? 'Something went wrong. Please try again.');
      setPayLoading(false);
    }
  };

  const handleSkipPayment = async () => {
    const token = vendorToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/mark-vendor-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentId: 'test-skip', orderId: 'test-skip' }),
    }).catch(() => {});
    setStep(5);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[400px] flex-shrink-0 p-10 text-white"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      >
        <div>
          <Link href="/" className="flex items-center gap-2 mb-12">
            <ShoppingBag size={22} className="text-orange-400" />
            <span className="font-black text-lg tracking-tight">RNVS CommerceX</span>
          </Link>
          <h1 className="text-3xl font-black leading-snug mb-4">
            Start selling to<br />
            <span className="text-orange-400">millions of buyers</span>
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed">
            Join thousands of sellers growing their business on India&apos;s fastest growing marketplace.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: Store, title: 'Dedicated Store Database', desc: 'Your products and orders — fully isolated.' },
              { icon: TrendingUp, title: 'Grow fast', desc: 'Reach 50,000+ active buyers instantly.' },
              { icon: Shield, title: 'Secure payouts', desc: 'Weekly payouts directly to your bank.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-blue-300 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-blue-400">
          Already a seller?{' '}
          <button onClick={() => router.push('/auth/login')} className="text-orange-400 underline">Sign in</button>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {step < 4 && (
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6">
              <ChevronLeft size={15} /> Back to Home
            </Link>
          )}

          {/* Step indicator — shown for steps 0–4 */}
          {step < 5 && (
            <div className="flex items-center gap-1 mb-8">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {i < step ? <CheckCircle2 size={13} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${i === step ? 'text-slate-800' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-300 mx-1" />}
                </div>
              ))}
            </div>
          )}

          {/* Error banner */}
          {error && step < 4 && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* ── Step 0: Account ── */}
          {step === 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">Create your account</h2>
                <p className="text-sm text-gray-500 mt-1">You&apos;ll use this to log in to your seller dashboard.</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">First name</label>
                    <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                      className={inp} placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last name</label>
                    <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                      className={inp} placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                    className={inp} placeholder="you@business.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Mobile <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                    className={inp} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      className={`${inp} pr-10`} placeholder="Min. 8 characters" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm password</label>
                  <input type="password" value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    className={`${inp} ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-amber-400' : form.confirmPassword && form.password === form.confirmPassword ? 'border-green-400' : ''}`}
                    placeholder="Re-enter password" />
                </div>
                <button onClick={handleNext}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Store Details ── */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">Set up your store</h2>
                <p className="text-sm text-gray-500 mt-1">This is what buyers will see when they visit your store.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Store name</label>
                  <input type="text" value={form.storeName} onChange={(e) => set('storeName', e.target.value)}
                    className={inp} placeholder="e.g. Tech Gadgets India" />
                  <p className="text-xs text-gray-400 mt-1">Choose a name that reflects your brand.</p>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setStep(0)}
                    className="flex items-center gap-1.5 px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    <ChevronLeft size={15} /> Back
                  </button>
                  <button onClick={handleNext}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    Continue <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Terms & Policy ── */}
          {step === 2 && (
            <div>
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={20} className="text-orange-500" />
                  <h2 className="text-2xl font-black text-slate-900">Terms &amp; Policy</h2>
                </div>
                <p className="text-sm text-gray-500">Please read and accept before continuing.</p>
              </div>

              {/* Scrollable terms + policy content */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 max-h-72 overflow-y-auto text-xs text-gray-600 leading-relaxed space-y-4 mb-4">

                <div>
                  <p className="font-bold text-slate-800 mb-1">Terms and Conditions</p>
                  <p className="font-semibold text-slate-700 mt-2">1. Who We Are</p>
                  <p>RNVS Inovative AI LLP (&quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;) operates CommerceX — a software platform that allows sellers (&quot;vendors&quot;) to run their own online store.</p>

                  <p className="font-semibold text-slate-700 mt-3">2. What You Get as a Vendor</p>
                  <p>Your own dedicated online store, a private database, tools to manage products, orders, employees, inventory and receipts, and customer support.</p>

                  <p className="font-semibold text-slate-700 mt-3">3. Pricing and Payments</p>
                  <p>There is no joining fee. We charge a monthly hosting and website maintenance fee, billed in advance (you pay at the start of each month, before that month begins). Cancel anytime.</p>
                  <p className="mt-1"><strong>Commission: none for now.</strong> You keep 100% of what you sell. This may change in the future as the platform grows, with at least 15 days&apos; notice before it takes effect.</p>

                  <p className="font-semibold text-slate-700 mt-3">4. Our Access to Your Sales Data</p>
                  <p>By registering, you agree that RNVS Inovative AI LLP can view your store&apos;s sales figures, order counts, and revenue data — only for monitoring platform health and complying with Indian tax laws. We do not sell your data or share it with other vendors.</p>

                  <p className="font-semibold text-slate-700 mt-3">5. GST TCS</p>
                  <p>As required under Section 52 of the CGST Act 2017, we collect <strong>1% TCS</strong> on your sales and deposit it with the government on your behalf.</p>

                  <p className="font-semibold text-slate-700 mt-3">6. Your Responsibilities</p>
                  <p>Sell only legal products. Provide accurate descriptions and pricing. Fulfil orders promptly. Keep your login secure. Do not misuse the platform.</p>

                  <p className="font-semibold text-slate-700 mt-3">7. Termination</p>
                  <p>We can suspend your store if you violate these terms, sell prohibited products, or fail to pay for more than 30 days. You can close your store anytime — your data will be deleted within 30 days.</p>

                  <p className="font-semibold text-slate-700 mt-3">8. Disputes</p>
                  <p>Disputes are governed by Indian law. Jurisdiction: Bangalore, Karnataka.</p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="font-bold text-slate-800 mb-1">Privacy Policy</p>
                  <p className="font-semibold text-slate-700 mt-2">1. What Information We Collect</p>
                  <p>Your full name, email, phone number, business details (store name, GST, PAN, Udyam number), bank account details, sales data, and login activity.</p>

                  <p className="font-semibold text-slate-700 mt-3">2. Why We Collect This</p>
                  <p>To create and manage your store, process payouts, comply with Indian tax laws (GST TCS under Section 52 of CGST Act 2017), and provide customer support.</p>

                  <p className="font-semibold text-slate-700 mt-3">3. Who We Share Your Data With</p>
                  <p>We do not sell your data. We may share it only with government authorities if required by Indian law, our payment partner, and trusted technology partners who help run the platform.</p>

                  <p className="font-semibold text-slate-700 mt-3">4. Your Sales Data</p>
                  <p>Your store data is in your own private database — no other vendor can see it.</p>

                  <p className="font-semibold text-slate-700 mt-3">5. How Long We Keep Your Data</p>
                  <p>While your store is active all data is kept. After closure it is deleted within 30 days. GST and financial records are kept for 7 years as required by Indian law.</p>

                  <p className="font-semibold text-slate-700 mt-3">6. Data Security</p>
                  <p>Encrypted database connections, secure login with session expiry, and a fully isolated store database per vendor.</p>

                  <p className="font-semibold text-slate-700 mt-3">7. Changes</p>
                  <p>We will notify you by email at least 15 days before any changes take effect.</p>
                </div>

                <p className="text-gray-400 pt-2 border-t border-gray-100">
                  Contact: contact@rnvsai.com &middot; RNVS Inovative AI LLP &middot; UDYAM-KR-03-0611765
                </p>
              </div>

              <div className="flex gap-2 text-xs mb-4">
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  className="text-orange-500 font-semibold hover:text-orange-600 underline underline-offset-2">
                  Full Terms &rarr;
                </a>
                <span className="text-gray-300">|</span>
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-orange-500 font-semibold hover:text-orange-600 underline underline-offset-2">
                  Full Privacy Policy &rarr;
                </a>
              </div>

              {/* Agreement checkbox */}
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
                <input
                  id="terms-check"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-orange-500 cursor-pointer flex-shrink-0"
                />
                <label htmlFor="terms-check" className="text-xs text-gray-700 leading-relaxed cursor-pointer">
                  I have read and agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer"
                    className="text-orange-500 font-semibold underline underline-offset-2 hover:text-orange-600">
                    Terms and Conditions
                  </a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer"
                    className="text-orange-500 font-semibold underline underline-offset-2 hover:text-orange-600">
                    Privacy Policy
                  </a>
                  {' '}of RNVS CommerceX. I understand that there is no commission on my sales at this time (commission: none for now — this may change in future with 15 days&apos; notice), and that <strong>1% GST TCS</strong> will be collected by the platform on my behalf.
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  onClick={() => { setError(''); setStep(3); }}
                  disabled={!termsAccepted}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Business Details ── */}
          {step === 3 && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={20} className="text-orange-500" />
                  <h2 className="text-2xl font-black text-slate-900">Business Details</h2>
                </div>
                <p className="text-sm text-gray-500">
                  PAN Card Number is required. Udyam Certificate and GST are optional.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Udyam Certificate Number <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.udyam}
                    onChange={(e) => set('udyam', e.target.value.toUpperCase())}
                    className={inp}
                    placeholder="UDYAM-MH-02-0012345"
                    maxLength={19}
                  />
                  <p className="text-xs text-gray-400 mt-1">Format: UDYAM-XX-00-0000000</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Company / Proprietor PAN Card Number
                  </label>
                  <input
                    type="text"
                    value={form.pan}
                    onChange={(e) => set('pan', e.target.value.toUpperCase())}
                    className={inp}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-400 mt-1">10-character alphanumeric PAN number</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    GST Number <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.gst}
                    onChange={(e) => set('gst', e.target.value.toUpperCase())}
                    className={inp}
                    placeholder="27ABCDE1234F1Z5"
                    maxLength={15}
                  />
                  <p className="text-xs text-gray-400 mt-1">15-character GSTIN — leave blank if not registered</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Why we ask this</p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    These details are used for seller verification and GST-compliant invoicing. They are stored securely and not shown to buyers.
                  </p>
                </div>

                <div className="flex gap-3 mt-2">
                  <button onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    <ChevronLeft size={15} /> Back
                  </button>
                  <button onClick={handleRegisterAndProceed} disabled={loading}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {loading ? 'Creating account...' : 'Continue to Payment →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Payment ── */}
          {step === 4 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">Activate Your Store</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Choose your plan. A payment link was also sent to{' '}
                  <span className="font-semibold text-slate-700">{form.email}</span>.
                </p>
              </div>

              {payError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{payError}</p>
                </div>
              )}

              {/* Plan toggle */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { id: 'monthly', label: 'Monthly', price: '₹2,999', sub: 'first 3 months', tag: 'then ₹4,999/mo' },
                  { id: 'yearly', label: 'Yearly', price: '₹49,990', sub: 'per year', tag: '2 months free' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => set('plan', opt.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.plan === opt.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{opt.label}</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{opt.price}</p>
                    <p className="text-xs text-gray-500">{opt.sub}</p>
                    <p className={`text-xs font-semibold mt-1 ${form.plan === opt.id ? 'text-orange-500' : 'text-gray-400'}`}>
                      {opt.tag}
                    </p>
                  </button>
                ))}
              </div>

              {/* Selected plan card */}
              {form.plan === 'monthly' ? (
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white text-center mb-4">
                  <span className="inline-block bg-white/20 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                    Introductory Offer
                  </span>
                  <div className="flex items-end justify-center gap-1">
                    <p className="text-4xl font-black">&#8377;2,999</p>
                    <p className="text-base opacity-80 mb-1">/month</p>
                  </div>
                  <p className="text-sm opacity-90 mt-1 font-semibold">First 3 months</p>
                  <p className="text-sm opacity-70 mt-0.5">Then &#8377;4,999/month &middot; cancel anytime</p>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white text-center mb-4">
                  <span className="inline-block bg-green-400/20 text-green-300 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                    Best Value &mdash; 2 Months Free
                  </span>
                  <div className="flex items-end justify-center gap-1">
                    <p className="text-4xl font-black">&#8377;49,990</p>
                    <p className="text-base opacity-80 mb-1">/year</p>
                  </div>
                  <p className="text-sm opacity-90 mt-1 font-semibold">Pay once, sell all year</p>
                  <p className="text-sm opacity-70 mt-0.5">vs &#8377;59,988 if billed monthly &middot; save &#8377;9,998</p>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What&apos;s included</p>
                <ul className="space-y-2">
                  {[
                    'Dedicated store database — fully isolated',
                    'Unlimited product listings',
                    'Order management & analytics',
                    'Custom branding & employee management',
                    'Ongoing priority support',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handlePay}
                disabled={payLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2 mb-3"
              >
                {payLoading
                  ? 'Preparing payment...'
                  : form.plan === 'yearly'
                  ? 'Pay ₹49,990 to Activate'
                  : 'Pay ₹2,999 to Activate'}
              </button>

              <div className="flex items-center justify-center gap-2">
                <Shield size={13} className="text-gray-400" />
                <p className="text-xs text-gray-400">Secured by Razorpay &middot; UPI, Cards, Net Banking, Wallets</p>
              </div>

              {form.plan === 'monthly' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-3 text-xs text-blue-700 leading-relaxed">
                  This is your <strong>first month&apos;s payment</strong>. Months 2 and 3 will be invoiced separately at &#8377;2,999/month. After 3 months the regular rate of &#8377;4,999/month applies.
                </div>
              )}

              <p className="text-center text-xs text-gray-400 mt-3">
                You can also pay later from the link sent to your email.
              </p>

              {/* Testing bypass */}
              <div className="mt-5 pt-4 border-t border-dashed border-gray-300 text-center">
                <button
                  onClick={handleSkipPayment}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Testing only
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Done ── */}
          {step === 5 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">You&apos;re all set!</h2>
              <p className="text-gray-500 text-sm mb-1">
                <span className="font-semibold text-slate-700">{form.storeName}</span> is now active.
              </p>
              <p className="text-gray-400 text-xs mb-8">
                Payment confirmed. A receipt has been sent to {form.email}.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { window.location.href = '/vendor/dashboard'; }}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Store size={16} /> Go to Seller Dashboard
                </button>
                <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Back to Homepage
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
