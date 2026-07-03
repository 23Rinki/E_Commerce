'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, User, Store, FileText, Lock, Pencil, X } from 'lucide-react';
import { vendorProfileApi } from '@/lib/api';

const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 transition-colors';
const inpReadOnly = 'w-full px-3 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed';
const viewField = 'w-full px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-slate-700 border border-gray-100';

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

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    storeName: '',
    udyam: '',
    pan: '',
    gst: '',
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  const loadProfile = () => {
    setLoading(true);
    vendorProfileApi.get()
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setProfile(d);
        setForm({
          firstName:   d.firstName ?? '',
          lastName:    d.lastName ?? '',
          phoneNumber: d.phoneNumber ?? '',
          storeName:   d.storeName ?? '',
          udyam:       d.udyamCertificateNumber ?? '',
          pan:         d.companyPanNumber ?? '',
          gst:         d.gstNumber ?? '',
        });
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProfile(); }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleEdit = () => {
    setSuccess('');
    setError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (!profile) return;
    setForm({
      firstName:   profile.firstName ?? '',
      lastName:    profile.lastName ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      storeName:   profile.storeName ?? '',
      udyam:       profile.udyamCertificateNumber ?? '',
      pan:         profile.companyPanNumber ?? '',
      gst:         profile.gstNumber ?? '',
    });
    setError('');
    setIsEditing(false);
  };

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    const hasUdyam = form.udyam.trim().length > 0;
    const hasPan   = form.pan.trim().length > 0;
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
    setSuccess('');
    setError('');
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    try {
      await vendorProfileApi.update({
        firstName:              form.firstName.trim(),
        lastName:               form.lastName.trim(),
        phoneNumber:            form.phoneNumber.trim() || undefined,
        storeName:              form.storeName.trim() || undefined,
        udyamCertificateNumber: form.udyam.trim().toUpperCase() || undefined,
        companyPanNumber:       form.pan.trim().toUpperCase() || undefined,
        gstNumber:              form.gst.trim().toUpperCase() || undefined,
      });
      setSuccess('Profile updated successfully.');
      setIsEditing(false);
      loadProfile();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditing ? 'Make changes and save when done.' : 'Your personal, store, and business details.'}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Pencil size={14} /> Edit Profile
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl mb-5">
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-5">

        {/* Personal Details */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-slate-600" />
            <h2 className="text-sm font-bold text-slate-800">Personal Details</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name</label>
              {isEditing
                ? <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inp} />
                : <div className={viewField}>{profile?.firstName || '—'}</div>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name</label>
              {isEditing
                ? <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inp} />
                : <div className={viewField}>{profile?.lastName || '—'}</div>}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Phone Number <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {isEditing
              ? <input type="tel" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)}
                  className={inp} placeholder="+91 98765 43210" />
              : <div className={viewField}>{profile?.phoneNumber || <span className="text-gray-400 italic">Not added</span>}</div>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
              <Lock size={11} /> Email <span className="text-gray-400 font-normal ml-1">(cannot be changed)</span>
            </label>
            <input type="email" value={profile?.email ?? ''} readOnly className={inpReadOnly} />
          </div>
        </section>

        {/* Store Details */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} className="text-slate-600" />
            <h2 className="text-sm font-bold text-slate-800">Store Details</h2>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Store Name</label>
            {isEditing
              ? <input type="text" value={form.storeName} onChange={(e) => set('storeName', e.target.value)}
                  className={inp} placeholder="e.g. Tech Gadgets India" />
              : <div className={viewField}>{profile?.storeName || '—'}</div>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Lock size={11} /> Account Status
              </label>
              <div className={`${inpReadOnly} flex items-center gap-1.5`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${profile?.status === 'Active' ? 'bg-green-500' : 'bg-amber-400'}`} />
                {profile?.status ?? '—'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Lock size={11} /> Member Since
              </label>
              <input readOnly
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                className={inpReadOnly} />
            </div>
          </div>
        </section>

        {/* Business Verification */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-slate-600" />
            <h2 className="text-sm font-bold text-slate-800">Business Verification</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {isEditing
              ? 'At least one of Udyam or PAN is required. GST is optional.'
              : 'Your registered business documents.'}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Udyam Certificate Number</label>
              {isEditing
                ? <input type="text" value={form.udyam}
                    onChange={(e) => set('udyam', e.target.value.toUpperCase())}
                    className={inp} placeholder="UDYAM-MH-02-0012345" maxLength={19} />
                : <div className={viewField}>{profile?.udyamCertificateNumber || <span className="text-gray-400 italic">Not added</span>}</div>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Company / Proprietor PAN</label>
              {isEditing
                ? <input type="text" value={form.pan}
                    onChange={(e) => set('pan', e.target.value.toUpperCase())}
                    className={inp} placeholder="AABCP1234C" maxLength={10} />
                : <div className={viewField}>{profile?.companyPanNumber || <span className="text-gray-400 italic">Not added</span>}</div>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                GST Number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              {isEditing
                ? <input type="text" value={form.gst}
                    onChange={(e) => set('gst', e.target.value.toUpperCase())}
                    className={inp} placeholder="27AABCP1234C1Z5" maxLength={15} />
                : <div className={viewField}>{profile?.gstNumber || <span className="text-gray-400 italic">Not added — click Edit to add</span>}</div>}
            </div>
          </div>

          {/* GST add nudge when not in edit mode and GST is missing */}
          {!isEditing && !profile?.gstNumber && (
            <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                No GST number on file. Your invoices will show a blank GSTIN.{' '}
                <button onClick={handleEdit} className="font-semibold underline underline-offset-2 hover:text-amber-900">
                  Add GST →
                </button>
              </p>
            </div>
          )}
        </section>

        {/* Action buttons */}
        {isEditing && (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
