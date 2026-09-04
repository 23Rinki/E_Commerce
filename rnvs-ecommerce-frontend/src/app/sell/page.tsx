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

const inp = 'w-full px-4 py-3 rounded-full border border-white/25 bg-white/15 text-white placeholder:text-white/65 text-sm outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/40 transition-colors';

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
    <div className="min-h-screen flex">

      {/* Left panel — unchanged */}
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

      {/* Right panel — restyled to MAISON dark glass */}
      <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden bg-stone-800">
        <img
          src="https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-stone-900/60" />
        <div className="absolute inset-0 bg-gradient-to-tr from-stone-900/50 via-stone-800/40 to-stone-700/30" />

        <div className="relative z-10 w-full max-w-md rounded-[2rem] p-8 border border-white/20 bg-stone-700/40 backdrop-blur-2xl text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]">

          {step < 4 && (
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-6">
              <ChevronLeft size={15} /> Back to Home
            </Link>
          )}

          {/* Step indicator — shown for steps 0–4 */}
          {step < 5 && (
            <div className="flex items-center gap-1 mb-8 flex-wrap">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${i < step ? 'bg-emerald-400 text-neutral-900' : i === step ? 'bg-white text-neutral-900' : 'bg-white/15 text-white/50'}`}>
                    {i < step ? <CheckCircle2 size={13} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${i === step ? 'text-white' : 'text-white/50'}`}>
                    {label}
                  </span>
                  {i < STEPS.length - 1 && <ChevronRight size={12} className="text-white/30 mx-1" />}
                </div>
              ))}
            </div>
          )}

          {/* Error banner */}
          {error && step < 4 && (
            <div className="bg-amber-400/20 border border-amber-300/40 text-amber-100 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* ── Step 0: Account ── */}
          {step === 0 && (
            <div>
              <div className="mb-6">
                <h2 className="font-display text-3xl text-white">Create your account</h2>
                <p className="text-sm text-white/75 mt-1">You&apos;ll use this to log in to your seller dashboard.</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">First name</label>
                    <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                      className={inp} placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">Last name</label>
                    <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                      className={inp} placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">Email address</label>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                    className={inp} placeholder="you@business.com" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">
                    Mobile <span className="text-white/50 font-normal normal-case">(optional)</span>
                  </label>
                  <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                    className={inp} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      className={`${inp} pr-10`} placeholder="Min. 8 characters" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">Confirm password</label>
                  <input type="password" value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    className={`${inp} ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-amber-300' : form.confirmPassword && form.password === form.confirmPassword ? 'border-emerald-300' : ''}`}
                    placeholder="Re-enter password" />
                </div>
                <button onClick={handleNext}
                  className="w-full h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 font-semibold transition-colors flex items-center justify-center gap-2 mt-2">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Store Details ── */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="font-display text-3xl text-white">Set up your store</h2>
                <p className="text-sm text-white/75 mt-1">This is what buyers will see when they visit your store.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">Store name</label>
                  <input type="text" value={form.storeName} onChange={(e) => set('storeName', e.target.value)}
                    className={inp} placeholder="e.g. Tech Gadgets India" />
                  <p className="text-xs text-white/50 mt-1">Choose a name that reflects your brand.</p>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setStep(0)}
                    className="flex items-center gap-1.5 px-5 h-12 rounded-full border border-white/25 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                    <ChevronLeft size={15} /> Back
                  </button>
                  <button onClick={handleNext}
                    className="flex-1 h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 font-semibold transition-colors flex items-center justify-center gap-2">
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
                  <FileText size={20} className="text-white/85" />
                  <h2 className="font-display text-3xl text-white">Terms &amp; Policy</h2>
                </div>
                <p className="text-sm text-white/75">Please read and accept before continuing.</p>
              </div>

              {/* Scrollable terms + policy content */}
              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 max-h-72 overflow-y-auto text-xs text-white/80 leading-relaxed space-y-4 mb-4">

                <div>
                  <p className="font-bold text-white mb-1">Terms and Conditions</p>
                  <p className="font-semibold text-white/90 mt-2">1. Who We Are</p>
                  <p>RNVS Inovative AI LLP (&quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;) operates CommerceX — a software platform that allows sellers (&quot;vendors&quot;) to run their own online store.</p>

                  <p className="font-semibold text-white/90 mt-3">2. What You Get as a Vendor</p>
                  <p>Your own dedicated online store, a private database, tools to manage products, orders, employees, inventory and receipts, and customer support.</p>

                  <p className="font-semibold text-white/90 mt-3">3. Pricing and Payments</p>
                  <p>There is no joining fee. We charge a monthly hosting and website maintenance fee, billed in advance (you pay at the start of each month, before that month begins). Cancel anytime.</p>
                  <p className="mt-1"><strong>Commission: none for now.</strong> You keep 100% of what you sell. This may change in the future as the platform grows, with at least 15 days&apos; notice before it takes effect.</p>

                  <p className="font-semibold text-white/90 mt-3">4. Our Access to Your Sales Data</p>
                  <p>By registering, you agree that RNVS Inovative AI LLP can view your store&apos;s sales figures, order counts, and revenue data — only for monitoring platform health and complying with Indian tax laws. We do not sell your data or share it with other vendors.</p>

                  <p className="font-semibold text-white/90 mt-3">5. GST TCS</p>
                  <p>As required under Section 52 of the CGST Act 2017, we collect <strong>1% TCS</strong> on your sales and deposit it with the government on your behalf.</p>

                  <p className="font-semibold text-white/90 mt-3">6. Your Responsibilities</p>
                  <p>Sell only legal products. Provide accurate descriptions and pricing. Fulfil orders promptly. Keep your login secure. Do not misuse the platform.</p>

                  <p className="font-semibold text-white/90 mt-3">7. Termination</p>
                  <p>We can suspend your store if you violate these terms, sell prohibited products, or fail to pay for more than 30 days. You can close your store anytime — your data will be deleted within 30 days.</p>

                  <p className="font-semibold text-white/90 mt-3">8. Disputes</p>
                  <p>Disputes are governed by Indian law. Jurisdiction: Bangalore, Karnataka.</p>
                </div>

                <div className="border-t border-white/15 pt-4">
                  <p className="font-bold text-white mb-1">Privacy Policy</p>
                  <p className="font-semibold text-white/90 mt-2">1. What Information We Collect</p>
                  <p>Your full name, email, phone number, business details (store name, GST, PAN, Udyam number), bank account details, sales data, and login activity.</p>

                  <p className="font-semibold text-white/90 mt-3">2. Why We Collect This</p>
                  <p>To create and manage your store, process payouts, comply with Indian tax laws (GST TCS under Section 52 of CGST Act 2017), and provide customer support.</p>

                  <p className="font-semibold text-white/90 mt-3">3. Who We Share Your Data With</p>
                  <p>We do not sell your data. We may share it only with government authorities if required by Indian law, our payment partner, and trusted technology partners who help run the platform.</p>

                  <p className="font-semibold text-white/90 mt-3">4. Your Sales Data</p>
                  <p>Your store data is in your own private database — no other vendor can see it.</p>

                  <p className="font-semibold text-white/90 mt-3">5. How Long We Keep Your Data</p>
                  <p>While your store is active all data is kept. After closure it is deleted within 30 days. GST and financial records are kept for 7 years as required by Indian law.</p>

                  <p className="font-semibold text-white/90 mt-3">6. Data Security</p>
                  <p>Encrypted database connections, secure login with session expiry, and a fully isolated store database per vendor.</p>

                  <p className="font-semibold text-white/90 mt-3">7. Changes</p>
                  <p>We will notify you by email at least 15 days before any changes take effect.</p>
                </div>

                <p className="text-white/50 pt-2 border-t border-white/15">
                  Contact: contact@rnvsai.com &middot; RNVS Inovative AI LLP &middot; UDYAM-KR-03-0611765
                </p>
              </div>

              <div className="flex gap-2 text-xs mb-4">
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  className="text-white font-semibold hover:underline underline-offset-2">
                  Full Terms &rarr;
                </a>
                <span className="text-white/30">|</span>
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-white font-semibold hover:underline underline-offset-2">
                  Full Privacy Policy &rarr;
                </a>
              </div>

              {/* Agreement checkbox */}
              <div className="flex items-start gap-3 bg-white/10 border border-white/20 rounded-2xl p-4 mb-5">
                <input
                  id="terms-check"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-white cursor-pointer flex-shrink-0"
                />
                <label htmlFor="terms-check" className="text-xs text-white/85 leading-relaxed cursor-pointer">
                  I have read and agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer"
                    className="text-white font-semibold underline underline-offset-2">
                    Terms and Conditions
                  </a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer"
                    className="text-white font-semibold underline underline-offset-2">
                    Privacy Policy
                  </a>
                  {' '}of RNVS CommerceX. I understand that there is no commission on my sales at this time (commission: none for now — this may change in future with 15 days&apos; notice), and that <strong>1% GST TCS</strong> will be collected by the platform on my behalf.
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-5 h-12 rounded-full border border-white/25 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  onClick={() => { setError(''); setStep(3); }}
                  disabled={!termsAccepted}
                  className="flex-1 h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center gap-2">
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
                  <FileText size={20} className="text-white/85" />
                  <h2 className="font-display text-3xl text-white">Business Details</h2>
                </div>
                <p className="text-sm text-white/75">
                  PAN Card Number is required. Udyam Certificate and GST are optional.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">
                    Udyam Certificate Number <span className="text-white/50 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.udyam}
                    onChange={(e) => set('udyam', e.target.value.toUpperCase())}
                    className={inp}
                    placeholder="UDYAM-MH-02-0012345"
                    maxLength={19}
                  />
                  <p className="text-xs text-white/50 mt-1">Format: UDYAM-XX-00-0000000</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">
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
                  <p className="text-xs text-white/50 mt-1">10-character alphanumeric PAN number</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/85 uppercase tracking-widest mb-1.5">
                    GST Number <span className="text-white/50 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.gst}
                    onChange={(e) => set('gst', e.target.value.toUpperCase())}
                    className={inp}
                    placeholder="27ABCDE1234F1Z5"
                    maxLength={15}
                  />
                  <p className="text-xs text-white/50 mt-1">15-character GSTIN — leave blank if not registered</p>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-white mb-1">Why we ask this</p>
                  <p className="text-xs text-white/75 leading-relaxed">
                    These details are used for seller verification and GST-compliant invoicing. They are stored securely and not shown to buyers.
                  </p>
                </div>

                <div className="flex gap-3 mt-2">
                  <button onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-5 h-12 rounded-full border border-white/25 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                    <ChevronLeft size={15} /> Back
                  </button>
                  <button onClick={handleRegisterAndProceed} disabled={loading}
                    className="flex-1 h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 disabled:opacity-60 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center gap-2">
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
                <h2 className="font-display text-3xl text-white">Activate Your Store</h2>
                <p className="text-sm text-white/75 mt-1">
                  Choose your plan. A payment link was also sent to{' '}
                  <span className="font-semibold text-white">{form.email}</span>.
                </p>
              </div>

              {payError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-2xl p-4 mb-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-200 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-100">{payError}</p>
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
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      form.plan === opt.id
                        ? 'border-white bg-white/20'
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    <p className="text-[11px] font-bold text-white/70 uppercase tracking-wide">{opt.label}</p>
                    <p className="text-xl font-black text-white mt-1">{opt.price}</p>
                    <p className="text-xs text-white/70">{opt.sub}</p>
                    <p className={`text-xs font-semibold mt-1 ${form.plan === opt.id ? 'text-white' : 'text-white/50'}`}>
                      {opt.tag}
                    </p>
                  </button>
                ))}
              </div>

              {/* Selected plan card */}
              {form.plan === 'monthly' ? (
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white text-center mb-4">
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
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white text-center mb-4">
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

              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 mb-4">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">What&apos;s included</p>
                <ul className="space-y-2">
                  {[
                    'Dedicated store database — fully isolated',
                    'Unlimited product listings',
                    'Order management & analytics',
                    'Custom branding & employee management',
                    'Ongoing priority support',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                      <CheckCircle2 size={14} className="text-emerald-300 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handlePay}
                disabled={payLoading}
                className="w-full h-14 rounded-full bg-white text-neutral-900 hover:bg-white/95 disabled:opacity-60 font-semibold transition-colors text-base flex items-center justify-center gap-2 mb-3"
              >
                {payLoading
                  ? 'Preparing payment...'
                  : form.plan === 'yearly'
                  ? 'Pay ₹49,990 to Activate'
                  : 'Pay ₹2,999 to Activate'}
              </button>

              <div className="flex items-center justify-center gap-2">
                <Shield size={13} className="text-white/50" />
                <p className="text-xs text-white/50">Secured by Razorpay &middot; UPI, Cards, Net Banking, Wallets</p>
              </div>

              {form.plan === 'monthly' && (
                <div className="bg-white/10 border border-white/20 rounded-2xl p-3 mt-3 text-xs text-white/80 leading-relaxed">
                  This is your <strong>first month&apos;s payment</strong>. Months 2 and 3 will be invoiced separately at &#8377;2,999/month. After 3 months the regular rate of &#8377;4,999/month applies.
                </div>
              )}

              <p className="text-center text-xs text-white/50 mt-3">
                You can also pay later from the link sent to your email.
              </p>

              {/* Testing bypass */}
              <div className="mt-5 pt-4 border-t border-dashed border-white/20 text-center">
                <button
                  onClick={handleSkipPayment}
                  className="px-4 py-2 bg-black/30 border border-white/20 hover:bg-black/50 text-white text-xs font-bold rounded-full transition-colors"
                >
                  Testing only
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Done ── */}
          {step === 5 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-300" />
              </div>
              <h2 className="font-display text-3xl text-white mb-2">You&apos;re all set!</h2>
              <p className="text-white/75 text-sm mb-1">
                <span className="font-semibold text-white">{form.storeName}</span> is now active.
              </p>
              <p className="text-white/50 text-xs mb-8">
                Payment confirmed. A receipt has been sent to {form.email}.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { window.location.href = '/vendor/dashboard'; }}
                  className="w-full h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Store size={16} /> Go to Seller Dashboard
                </button>
                <Link href="/" className="block text-sm text-white/70 hover:text-white transition-colors">
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
