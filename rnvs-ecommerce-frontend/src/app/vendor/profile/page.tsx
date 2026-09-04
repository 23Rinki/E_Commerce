'use client';

import { useEffect, useState } from 'react';
import {
  User, Store, FileText, Pencil, Mail, Lock, Phone, Calendar,
  ShieldCheck, AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, X,
} from 'lucide-react';
import { vendorProfileApi } from '@/lib/api';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  storeName: string;
  status: string;
  udyamCertificateNumber: string;
  companyPanNumber: string;
  gstNumber: string;
}

const inputCls = 'w-full px-3 py-2.5 border border-[#3B5BDB]/15 rounded-lg text-sm focus:outline-none focus:border-[#3B5BDB] focus:ring-2 focus:ring-[#3B5BDB]/10 transition-colors text-[#0A1128]';

function Card({ icon: Icon, title, subtitle, children }: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6 md:p-7 space-y-5">
      <header className="flex items-center gap-2.5">
        <span className="h-8 w-8 rounded-lg bg-[#E6F0FA] text-[#3B5BDB] flex items-center justify-center"><Icon size={16} /></span>
        <div>
          <h2 className="text-base font-semibold text-[#0A1128] leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({ label, hint, locked, children }: {
  label: string;
  hint?: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
        {locked && <Lock size={11} className="text-slate-400" />}
        {label}
        {hint && <span className="font-normal text-slate-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function ReadonlyInput({ value, muted, prefixIcon: Prefix, placeholder }: {
  value: string;
  muted?: boolean;
  prefixIcon?: React.ComponentType<{ size?: number; className?: string }>;
  placeholder?: string;
}) {
  const empty = !value;
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-[#3B5BDB]/12 bg-[#F8FAFC] px-3 py-2.5 text-sm ${muted || empty ? 'text-slate-400' : 'text-[#0A1128]'}`}>
      {Prefix && <Prefix size={14} className="text-slate-400" />}
      <span className={`truncate ${empty ? 'italic' : ''}`}>{value || placeholder || 'Not added'}</span>
    </div>
  );
}

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', phoneNumber: '', storeName: '', udyam: '', pan: '', gst: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadProfile = () => {
    setLoading(true);
    vendorProfileApi.get()
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setProfile(d);
        setForm({
          firstName: d.firstName ?? '',
          lastName: d.lastName ?? '',
          phoneNumber: d.phoneNumber ?? '',
          storeName: d.storeName ?? '',
          udyam: d.udyamCertificateNumber ?? '',
          pan: d.companyPanNumber ?? '',
          gst: d.gstNumber ?? '',
        });
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProfile(); }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleEdit = () => { setSuccess(''); setError(''); setIsEditing(true); };

  const handleCancel = () => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      storeName: profile.storeName ?? '',
      udyam: profile.udyamCertificateNumber ?? '',
      pan: profile.companyPanNumber ?? '',
      gst: profile.gstNumber ?? '',
    });
    setError('');
    setIsEditing(false);
  };

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    const hasUdyam = form.udyam.trim().length > 0;
    const hasPan = form.pan.trim().length > 0;
    if (!hasUdyam && !hasPan) return 'At least one of Udyam or PAN is required.';
    if (hasUdyam && !/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i.test(form.udyam.trim()))
      return 'Invalid Udyam number. Format: UDYAM-MH-02-0012345';
    if (hasPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.pan.trim()))
      return 'Invalid PAN number. Example: AABCP1234C';
    if (form.gst.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(form.gst.trim()))
      return 'Invalid GSTIN format. Example: 27AABCP1234C1Z5';
    return '';
  };

  const handleSave = async () => {
    setSuccess(''); setError('');
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    try {
      await vendorProfileApi.update({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        storeName: form.storeName.trim() || undefined,
        udyamCertificateNumber: form.udyam.trim().toUpperCase() || undefined,
        companyPanNumber: form.pan.trim().toUpperCase() || undefined,
        gstNumber: form.gst.trim().toUpperCase() || undefined,
      });
      setSuccess('Profile updated successfully.');
      setIsEditing(false);
      loadProfile();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to save. Please try again.');
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

  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || 'V';
  const hasGst = !!profile?.gstNumber;
  const isActive = (profile?.status ?? '').toLowerCase() === 'active';
  const kycComplete = !!(profile?.udyamCertificateNumber || profile?.companyPanNumber);
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <main className="min-h-screen bg-[#E6F0FA] p-4 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0A1128] tracking-tight">My Profile</h1>
            <p className="text-sm text-slate-500 mt-1">
              {isEditing ? 'Make changes and save when done.' : 'Your personal, store, and business details.'}
            </p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-2 rounded-full bg-[#0A1128] hover:bg-[#111a3b] text-white px-5 py-2.5 text-sm font-medium shadow-sm"
            >
              <Pencil size={14} /> Edit Profile
            </button>
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
          {/* LEFT */}
          <div className="lg:col-span-8 space-y-6">
            <Card icon={User} title="Personal Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="First Name">
                  {isEditing
                    ? <input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                    : <ReadonlyInput value={profile?.firstName ?? ''} />}
                </Field>
                <Field label="Last Name">
                  {isEditing
                    ? <input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
                    : <ReadonlyInput value={profile?.lastName ?? ''} />}
                </Field>
                <Field label="Phone Number" hint="optional">
                  {isEditing
                    ? <input type="tel" className={inputCls} value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} placeholder="+91 98765 43210" />
                    : <ReadonlyInput value={profile?.phoneNumber ?? ''} prefixIcon={Phone} />}
                </Field>
                <Field label="Email" hint="cannot be changed" locked>
                  <ReadonlyInput value={profile?.email ?? ''} prefixIcon={Mail} muted />
                </Field>
              </div>
            </Card>

            <Card icon={Store} title="Store Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field label="Store Name">
                    {isEditing
                      ? <input className={inputCls} value={form.storeName} onChange={(e) => set('storeName', e.target.value)} placeholder="e.g. Tech Gadgets India" />
                      : <ReadonlyInput value={profile?.storeName ?? ''} />}
                  </Field>
                </div>
                <Field label="Account Status" locked>
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm">
                    <span className="relative flex h-2 w-2">
                      {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    </span>
                    <span className="font-medium text-emerald-700 capitalize">{profile?.status || '—'}</span>
                  </div>
                </Field>
                <Field label="Member Since" locked>
                  <ReadonlyInput value={memberSince} prefixIcon={Calendar} muted />
                </Field>
              </div>
            </Card>

            <Card icon={FileText} title="Business Verification" subtitle={isEditing ? 'At least one of Udyam or PAN is required. GST is optional.' : 'Your registered business documents.'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Udyam Certificate Number">
                  {isEditing
                    ? <input className={inputCls} value={form.udyam} onChange={(e) => set('udyam', e.target.value.toUpperCase())} placeholder="UDYAM-MH-02-0012345" maxLength={19} />
                    : <ReadonlyInput value={profile?.udyamCertificateNumber ?? ''} />}
                </Field>
                <Field label="Company / Proprietor PAN">
                  {isEditing
                    ? <input className={inputCls} value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} placeholder="AABCP1234C" maxLength={10} />
                    : <ReadonlyInput value={profile?.companyPanNumber ?? ''} />}
                </Field>
                <div className="md:col-span-2">
                  <Field label="GST Number" hint="optional">
                    {isEditing
                      ? <input className={inputCls} value={form.gst} onChange={(e) => set('gst', e.target.value.toUpperCase())} placeholder="27AABCP1234C1Z5" maxLength={15} />
                      : <ReadonlyInput value={profile?.gstNumber ?? ''} placeholder="Not added — click Edit to add" />}
                  </Field>
                </div>
              </div>

              {!isEditing && !hasGst && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm text-amber-900">No GST number on file. Your invoices will show a blank GSTIN.</div>
                  <button onClick={handleEdit} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2">
                    Add GST <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </Card>

            {isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-3 border border-[#3B5BDB]/15 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#3B5BDB] hover:bg-[#304AC0] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
            <div className="relative bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6 text-center overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#3B5BDB]/15 to-transparent pointer-events-none" />
              <div className="relative mx-auto h-20 w-20 rounded-full bg-[#3B5BDB] text-white text-2xl font-bold flex items-center justify-center ring-4 ring-white shadow-md">
                {initials}
              </div>
              <div className="mt-3 text-lg font-semibold text-[#0A1128]">{profile?.firstName} {profile?.lastName}</div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Mail size={11} /> {profile?.email}
              </div>
              {kycComplete && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs font-medium">
                  <BadgeCheck size={12} /> Verified merchant
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#3B5BDB]/10 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#0A1128] uppercase tracking-wider">At a glance</h3>
              <ul className="text-sm divide-y divide-slate-100">
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 flex items-center gap-2"><Store size={14} /> Store</span>
                  <span className="font-medium text-[#0A1128]">{profile?.storeName || '—'}</span>
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 flex items-center gap-2"><Calendar size={14} /> Member since</span>
                  <span className="font-medium text-[#0A1128]">{memberSince}</span>
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 flex items-center gap-2"><ShieldCheck size={14} /> KYC</span>
                  <span className={`font-medium ${kycComplete ? 'text-emerald-700' : 'text-amber-600'}`}>
                    {kycComplete ? 'Complete' : 'Pending'}
                  </span>
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 flex items-center gap-2"><FileText size={14} /> GST filed</span>
                  <span className={`font-medium ${hasGst ? 'text-emerald-700' : 'text-amber-600'}`}>
                    {hasGst ? 'Yes' : 'Pending'}
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
