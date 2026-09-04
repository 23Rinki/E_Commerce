'use client';

import { useEffect, useState } from 'react';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import api from '@/lib/api';
import {
  Landmark, ShieldCheck, Eye, EyeOff, CheckCircle2, Clock, Info, AlertTriangle,
  CalendarClock, ArrowRight, CircleDollarSign, Lock,
} from 'lucide-react';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
const ACNO_RE = /^\d{9,18}$/;
const UPI_RE = /^[\w.\-]+@[\w]+$/;

const inputCls = 'w-full rounded-lg border border-[#3B5BDB]/15 bg-[#F8FAFC] focus:bg-white focus:border-[#3B5BDB] focus:ring-2 focus:ring-[#3B5BDB]/20 outline-none px-3 py-2.5 text-sm text-[#0A1128] transition-colors';

interface Payout {
  id: number;
  payoutNumber: string;
  amount: number;
  status: number; // 0 Pending, 1 Processing, 2 Completed, 3 Failed, 4 Cancelled
  startDate: string;
  endDate: string;
  processedAt: string | null;
}

const PAYOUT_STATUS_LABEL: Record<number, string> = {
  0: 'Pending', 1: 'Processing', 2: 'Completed', 3: 'Failed', 4: 'Cancelled',
};

function FieldLabel({ htmlFor, required, hint, children }: {
  htmlFor: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
      {children}
      {required && <span className="text-amber-500">*</span>}
      {hint && <span className="font-medium normal-case tracking-normal text-slate-400 ml-1">({hint})</span>}
    </label>
  );
}

function FormField({ id, label, required, hint, value, onChange, placeholder, uppercase, maxLength }: {
  id: string; label: string; required?: boolean; hint?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string;
  uppercase?: boolean; maxLength?: number;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} hint={hint}>{label}</FieldLabel>
      <input
        id={id} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength}
        className={`${inputCls} ${uppercase ? 'uppercase tracking-wider' : ''}`}
      />
    </div>
  );
}

export default function BankAccountPage() {
  const { designation } = useVendorStore();
  useVendorAccess('bank-account', designation);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [nextPayout, setNextPayout] = useState<Payout | null>(null);

  const [form, setForm] = useState({
    accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', accountType: 'Savings', upiId: '',
  });

  useEffect(() => {
    api.get('/api/users/bank-account')
      .then((r) => {
        const d = r.data?.data;
        if (d) {
          setHasAccount(true);
          setIsVerified(d.isVerified);
          setForm({
            accountHolderName: d.accountHolderName ?? '',
            bankName: d.bankName ?? '',
            accountNumber: d.accountNumberFull ?? '',
            ifscCode: d.ifscCode ?? '',
            accountType: d.accountType ?? 'Savings',
            upiId: d.upiId ?? '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api.get('/api/vendors/payouts')
      .then((r) => {
        const list: Payout[] = r.data?.data ?? r.data ?? [];
        const upcoming = list.find((p) => p.status === 0 || p.status === 1) ?? null;
        setNextPayout(upcoming);
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): string => {
    if (!form.accountHolderName.trim()) return 'Account holder name is required.';
    if (!form.bankName.trim()) return 'Bank name is required.';
    if (!ACNO_RE.test(form.accountNumber.trim())) return 'Account number must be 9–18 digits.';
    if (!IFSC_RE.test(form.ifscCode.trim())) return 'Invalid IFSC code. Format: HDFC0001234';
    if (form.upiId.trim() && !UPI_RE.test(form.upiId.trim())) return 'Invalid UPI ID. Format: name@upi';
    return '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(''); setError('');
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    try {
      await api.post('/api/users/bank-account', {
        accountHolderName: form.accountHolderName.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        accountType: form.accountType,
        upiId: form.upiId.trim() || null,
      });
      setHasAccount(true);
      setIsVerified(false);
      setSuccess('Bank account saved. Our team will verify it within 1–2 business days.');
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#E6F0FA] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3B5BDB]/30 border-t-[#3B5BDB] rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E6F0FA] p-4 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-xl bg-white text-[#3B5BDB] border border-[#3B5BDB]/15 shadow-sm flex items-center justify-center">
              <Landmark size={18} />
            </span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#0A1128] tracking-tight leading-none">Bank Account</h1>
              <p className="text-sm text-slate-500 mt-1.5">Add your bank details to receive weekly payouts for your sales.</p>
            </div>
          </div>
          {hasAccount && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border ${
              isVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {isVerified ? <ShieldCheck size={12} /> : <Clock size={12} />}
              {isVerified ? 'Account verified' : 'Verification pending'}
            </span>
          )}
        </header>

        {success && (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl">
            <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* FORM */}
          <form onSubmit={handleSave} className="lg:col-span-7 bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6 md:p-8 space-y-5">
            <FormField id="holder" label="Account Holder Name" required
              value={form.accountHolderName} onChange={(e) => set('accountHolderName', e.target.value)}
              placeholder="As printed on your passbook" />
            <FormField id="bank" label="Bank Name" required
              value={form.bankName} onChange={(e) => set('bankName', e.target.value)}
              placeholder="e.g. HDFC Bank, SBI, ICICI Bank" />

            <div>
              <FieldLabel htmlFor="account" required>Account Number</FieldLabel>
              <div className="relative">
                <input
                  id="account" type={showNumber ? 'text' : 'password'}
                  value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="9–18 digit account number" maxLength={18}
                  className={`${inputCls} pr-16 tracking-widest`}
                />
                <button type="button" onClick={() => setShowNumber((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-medium text-[#3B5BDB] hover:text-[#2C46B8] px-2 py-1 rounded-md hover:bg-[#E6F0FA]">
                  {showNumber ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1"><Lock size={10} /> Encrypted at rest · never displayed in full again</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="ifsc" label="IFSC Code" required value={form.ifscCode}
                onChange={(e) => set('ifscCode', e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" uppercase maxLength={11} />
              <FormField id="upi" label="UPI ID" hint="optional" value={form.upiId}
                onChange={(e) => set('upiId', e.target.value)} placeholder="yourname@upi or 9876543210@paytm" />
            </div>

            <div>
              <FieldLabel htmlFor="accountType" required>Account Type</FieldLabel>
              <div id="accountType" className="flex gap-3">
                {['Savings', 'Current'].map((t) => (
                  <button key={t} type="button" onClick={() => set('accountType', t)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      form.accountType === t
                        ? 'bg-[#E6F0FA] border-[#3B5BDB] text-[#3B5BDB]'
                        : 'border-[#3B5BDB]/15 text-slate-500 hover:border-[#3B5BDB]/30'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-[#E6F0FA]/70 border border-[#3B5BDB]/10 px-3 py-2.5 text-xs text-slate-600">
              <Info size={14} className="text-[#3B5BDB] shrink-0 mt-0.5" />
              Updating your account details will reset verification status. Your first payout goes on hold for 24h while we re-verify.
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#3B5BDB] hover:bg-[#2C46B8] disabled:opacity-60 text-white px-6 py-3 text-sm font-semibold shadow-sm transition-colors">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                  : <>{hasAccount ? 'Update Bank Account' : 'Save Bank Account'} <ArrowRight size={14} /></>}
              </button>
              <a href="/vendor/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-[#3B5BDB]/20 text-[#3B5BDB] hover:bg-[#E6F0FA] px-5 py-3 text-sm font-medium">
                Testing only
              </a>
            </div>
          </form>

          {/* SIDE */}
          <aside className="lg:col-span-5 lg:sticky lg:top-6 space-y-6">
            <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #3B5BDB 0%, #1E3A8A 100%)' }}>
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-white/70">Payout account</span>
                <Landmark size={18} className="text-white/80" />
              </div>
              <div className="relative mt-8 font-mono text-lg tracking-widest">
                •••• •••• •••• {(form.accountNumber || '0000').slice(-4).padStart(4, '•')}
              </div>
              <div className="relative mt-6 flex items-end justify-between text-xs">
                <div>
                  <div className="text-white/60 uppercase tracking-wider text-[10px]">Holder</div>
                  <div className="font-semibold truncate max-w-[220px]">{form.accountHolderName || 'Your name'}</div>
                </div>
                <div className="text-right">
                  <div className="text-white/60 uppercase tracking-wider text-[10px]">IFSC</div>
                  <div className="font-semibold font-mono">{form.ifscCode?.toUpperCase() || '—'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-5 flex items-center gap-4">
              <span className="h-10 w-10 rounded-xl bg-[#E6F0FA] text-[#3B5BDB] flex items-center justify-center">
                <CalendarClock size={18} />
              </span>
              {nextPayout ? (
                <>
                  <div className="flex-1">
                    <div className="text-xs text-slate-500">Next payout</div>
                    <div className="text-base font-semibold text-[#0A1128]">
                      {new Date(nextPayout.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ₹{nextPayout.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
                    <CircleDollarSign size={11} /> {PAYOUT_STATUS_LABEL[nextPayout.status]}
                  </span>
                </>
              ) : (
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Next payout</div>
                  <div className="text-sm text-slate-400 mt-0.5">No payout scheduled yet — appears after your first settled orders</div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6">
              <h3 className="text-xs font-bold text-[#0A1128] uppercase tracking-wider mb-4">How payouts work</h3>
              <ol className="space-y-4">
                {[
                  { title: 'Weekly cycle', body: 'Payouts run every Monday for the previous week’s settled orders.' },
                  { title: 'Zero commission', body: 'No cut for now — you receive the full sale amount.' },
                  { title: 'Bank credit', body: 'Funds arrive within 1–3 business days after processing.' },
                ].map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-[#E6F0FA] text-[#3B5BDB] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div>
                      <div className="text-sm font-semibold text-[#0A1128] leading-tight">{s.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">{s.body}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs text-emerald-800">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>256-bit encryption. Your details are never shared with buyers.</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
