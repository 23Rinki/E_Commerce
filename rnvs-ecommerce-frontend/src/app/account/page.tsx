'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api';
import { Package, Heart, MapPin, LogOut, ChevronRight, Edit2, Check, X } from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, logout, initAuth } = useAuthStore();

  const [gst, setGst]           = useState('');
  const [editingGst, setEditingGst] = useState(false);
  const [gstInput, setGstInput] = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) router.push('/auth/login');
  }, [isInitialized, isAuthenticated]);

  // Load saved GST from profile
  useEffect(() => {
    if (!isAuthenticated) return;
    usersApi.getProfile()
      .then((r) => {
        const data = r.data?.data || r.data;
        setGst(data?.gstNumber || '');
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const startEditGst = () => { setGstInput(gst); setEditingGst(true); };
  const cancelGst    = () => { setEditingGst(false); };

  const saveGst = async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile({ gstNumber: gstInput.trim().toUpperCase() || null });
      setGst(gstInput.trim().toUpperCase());
      setEditingGst(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const menuItems = [
    { icon: Package, label: 'My Orders',  desc: 'Track and manage your orders',    href: '/account/orders' },
    { icon: Heart,   label: 'Wishlist',   desc: 'Products you saved for later',     href: '/account/wishlist' },
    { icon: MapPin,  label: 'Addresses',  desc: 'Manage your delivery addresses',   href: '/account/addresses' },
  ];

  const gstValid = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstInput);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-2xl font-black">
          {user.firstName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-black">{user.firstName} {user.lastName}</h1>
          <p className="text-gray-400 text-sm">{user.email}</p>
          <span className="inline-block mt-1.5 bg-orange-500/20 text-orange-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-500/30">
            {user.role || 'Customer'}
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-2 mb-6">
        {menuItems.map(({ icon: Icon, label, desc, href }) => (
          <Link key={label} href={href}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-orange-300 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500 transition-colors">
              <Icon size={18} className="text-orange-500 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Business GST card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Business GST Number</p>
            <p className="text-xs text-gray-500 mt-0.5">Used on B2B tax invoices for input tax credit</p>
          </div>
          {!editingGst && (
            <button onClick={startEditGst}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-semibold">
              <Edit2 size={13} /> {gst ? 'Edit' : 'Add'}
            </button>
          )}
        </div>

        {editingGst ? (
          <div className="space-y-2">
            <input
              type="text"
              value={gstInput}
              onChange={(e) => setGstInput(e.target.value.toUpperCase())}
              placeholder="e.g. 27ABCDE1234F1Z5"
              maxLength={15}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 font-mono"
            />
            {gstInput && !gstValid && (
              <p className="text-xs text-amber-600">Invalid GSTIN format — must be 15 characters</p>
            )}
            {gstInput && gstValid && (
              <p className="text-xs text-green-600">✓ Valid GSTIN format</p>
            )}
            <div className="flex gap-2">
              <button onClick={saveGst} disabled={saving || (!!gstInput && !gstValid)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-colors">
                <Check size={13} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={cancelGst}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors">
                <X size={13} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className={`text-sm font-mono ${gst ? 'text-slate-800' : 'text-gray-400'}`}>
            {gst || 'Not set — add your GSTIN to get B2B tax invoices'}
          </p>
        )}
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-slate-500 hover:bg-gray-50 font-semibold py-3.5 rounded-2xl transition-colors">
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
}
