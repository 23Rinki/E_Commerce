'use client';

import { useEffect, useState } from 'react';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import api from '@/lib/api';
import { CheckCircle2, AlertTriangle, Landmark, ShieldCheck, Clock } from 'lucide-react';

const inp = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 transition-colors';

const IFSC_RE   = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
const ACNO_RE   = /^\d{9,18}$/;
const UPI_RE    = /^[\w.\-]+@[\w]+$/;

function mask(n: string) {
  return n.length > 4 ? '•'.repeat(n.length - 4) + n.slice(-4) : n;
}

export default function BankAccountPage() {
  const { designation } = useVendorStore();
  useVendorAccess('bank-account', designation);

  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [success, setSuccess]   = useState('');
  const [error,   setError]     = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [showNumber, setShowNumber] = useState(false);

  const [form, setForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountType: 'Savings',
    upiId: '',
  });

  useEffect(() => {
    api.get('/api/users/bank-account')
      .then(r => {
        const d = r.data?.data;
        if (d) {
          setHasAccount(true);
          setIsVerified(d.isVerified);
          setForm({
            accountHolderName: d.accountHolderName ?? '',
            bankName:          d.bankName ?? '',
            accountNumber:     d.accountNumberFull ?? '',
            ifscCode:          d.ifscCode ?? '',
            accountType:       d.accountType ?? 'Savings',
            upiId:             d.upiId ?? '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

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
        bankName:          form.bankName.trim(),
        accountNumber:     form.accountNumber.trim(),
        ifscCode:          form.ifscCode.trim().toUpperCase(),
        accountType:       form.accountType,
        upiId:             form.upiId.trim() || null,
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
      <div className="p-6 flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Landmark size={22} /> Bank Account
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Add your bank details to receive weekly payouts for your sales.
        </p>
      </div>

      {/* Verification status */}
      {hasAccount && (
        <div className={`flex items-start gap-3 rounded-xl p-4 mb-6 ${
          isVerified
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          {isVerified
            ? <ShieldCheck size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            : <Clock size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />}
          <div>
            <p className={`text-sm font-bold ${isVerified ? 'text-green-800' : 'text-yellow-800'}`}>
              {isVerified ? 'Account Verified' : 'Verification Pending'}
            </p>
            <p className={`text-xs mt-0.5 ${isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {isVerified
                ? 'Your bank account is verified. Payouts will be sent here.'
                : 'Our team will verify your account within 1–2 business days.'}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">

        {/* Account holder */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Account Holder Name <span className="text-red-400">*</span>
          </label>
          <input className={inp} value={form.accountHolderName}
            onChange={e => set('accountHolderName', e.target.value)}
            placeholder="As printed on your passbook" />
        </div>

        {/* Bank name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Bank Name <span className="text-red-400">*</span>
          </label>
          <input className={inp} value={form.bankName}
            onChange={e => set('bankName', e.target.value)}
            placeholder="e.g. HDFC Bank, SBI, ICICI Bank" />
        </div>

        {/* Account number */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Account Number <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              className={inp}
              type={showNumber ? 'text' : 'password'}
              value={form.accountNumber}
              onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))}
              placeholder="9–18 digit account number"
              maxLength={18}
            />
            <button
              type="button"
              onClick={() => setShowNumber(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-slate-600"
            >
              {showNumber ? 'Hide' : 'Show'}
            </button>
          </div>
          {form.accountNumber && !showNumber && (
            <p className="text-xs text-gray-400 mt-1">{mask(form.accountNumber)}</p>
          )}
        </div>

        {/* IFSC */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            IFSC Code <span className="text-red-400">*</span>
          </label>
          <input className={inp} value={form.ifscCode}
            onChange={e => set('ifscCode', e.target.value.toUpperCase())}
            placeholder="e.g. HDFC0001234"
            maxLength={11} />
          <p className="text-xs text-gray-400 mt-1">11-character code found on your cheque book or passbook</p>
        </div>

        {/* Account type */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Account Type <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            {['Savings', 'Current'].map(t => (
              <button key={t} type="button"
                onClick={() => set('accountType', t)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                  form.accountType === t
                    ? 'bg-orange-50 border-orange-400 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* UPI */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            UPI ID <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input className={inp} value={form.upiId}
            onChange={e => set('upiId', e.target.value)}
            placeholder="e.g. yourname@upi or 9876543210@paytm" />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
              : hasAccount ? 'Update Bank Account' : 'Save Bank Account'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Updating your account details will reset verification status.
          </p>
          <div className="mt-4 pt-4 border-t border-dashed border-gray-200 text-center">
            <a href="/vendor/dashboard" className="text-xs font-bold text-slate-800 hover:text-orange-500 underline underline-offset-2">
              Testing only
            </a>
          </div>
        </div>
      </form>

      {/* Payout info */}
      <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How Payouts Work</p>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold flex-shrink-0">1.</span>
            Payouts are processed every Monday for the previous week's settled orders.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold flex-shrink-0">2.</span>
            Commission: none for now — you receive the full sale amount.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold flex-shrink-0">3.</span>
            Funds arrive in your account within 1–3 business days after processing.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold flex-shrink-0">4.</span>
            Minimum payout threshold: ₹500.
          </li>
        </ul>
      </div>
    </div>
  );
}
