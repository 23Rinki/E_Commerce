'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addressesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { MapPin, Plus, Pencil, Trash2, Star, ArrowLeft, X, Check } from 'lucide-react';

interface AddressDto {
  id: number;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  type: number; // 0 = Shipping, 1 = Billing
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
  type: 0,
};

type FormState = typeof EMPTY_FORM;

export default function AddressesPage() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();

  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  useEffect(() => {
    initAuth();
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    fetchAddresses();
  }, [isAuthenticated]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAddresses = async () => {
    try {
      const res = await addressesApi.getAll();
      setAddresses(res.data?.data || res.data || []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openEditForm = (addr: AddressDto) => {
    setEditingId(addr.id);
    setForm({
      firstName: addr.firstName,
      lastName: addr.lastName,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      isDefault: addr.isDefault,
      type: addr.type,
    });
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  };

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim())  e.lastName  = 'Required';
    if (!form.street.trim())    e.street    = 'Required';
    if (!form.city.trim())      e.city      = 'Required';
    if (!form.state.trim())     e.state     = 'Required';
    if (!form.postalCode.trim()) e.postalCode = 'Required';
    if (!form.country.trim())   e.country   = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId !== null) {
        await addressesApi.update(editingId, form);
        showToast('Address updated');
      } else {
        await addressesApi.create(form);
        showToast('Address added');
      }
      closeForm();
      fetchAddresses();
    } catch {
      showToast('Failed to save address', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await addressesApi.remove(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address deleted');
    } catch {
      showToast('Failed to delete address', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: number) => {
    setSettingDefaultId(id);
    try {
      await addressesApi.setDefault(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
      showToast('Default address updated');
    } catch {
      showToast('Failed to update default', 'error');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const Field = ({
    label, field, placeholder, type = 'text',
  }: { label: string; field: keyof FormState; placeholder?: string; type?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-neutral-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[field] as string}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors
          ${errors[field] ? 'border-red-400 bg-red-50' : 'border-neutral-200 focus:border-neutral-900'}`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-0.5">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/account" className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-neutral-700" />
          </Link>
          <div>
            <h1 className="font-display tracking-tight text-2xl text-neutral-900">My Addresses</h1>
            {!loading && addresses.length > 0 && (
              <p className="text-sm text-neutral-500">{addresses.length} saved {addresses.length === 1 ? 'address' : 'addresses'}</p>
            )}
          </div>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
        >
          <Plus size={16} /> Add New
        </button>
      </div>

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="font-display tracking-tight text-lg text-neutral-900">
                {editingId !== null ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button onClick={closeForm} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                <X size={18} className="text-neutral-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" field="firstName" placeholder="Rahul" />
                <Field label="Last Name"  field="lastName"  placeholder="Sharma" />
              </div>
              <Field label="Street Address" field="street" placeholder="123 MG Road, Apt 4B" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"   field="city"   placeholder="Mumbai" />
                <Field label="State"  field="state"  placeholder="Maharashtra" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Postal Code" field="postalCode" placeholder="400001" />
                <Field label="Country"     field="country"    placeholder="India" />
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Address Type</label>
                <div className="flex gap-3">
                  {[{ label: 'Shipping', value: 0 }, { label: 'Billing', value: 1 }].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                      className={`flex-1 py-2 rounded-full text-sm font-semibold border transition-colors ${
                        form.type === t.value
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Set as default */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    form.isDefault ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                  }`}
                >
                  {form.isDefault && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm font-medium text-neutral-700">Set as default address</span>
              </label>
            </div>

            <div className="flex gap-3 p-5 border-t border-neutral-100">
              <button
                onClick={closeForm}
                className="flex-1 border border-neutral-200 text-neutral-600 font-semibold py-2.5 rounded-xl hover:bg-neutral-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-full transition-colors text-sm"
              >
                {saving ? 'Saving...' : editingId !== null ? 'Update Address' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="bg-neutral-200 rounded-2xl h-32 animate-pulse" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={36} className="text-neutral-300" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-800 mb-2">No addresses yet</h3>
          <p className="text-neutral-500 mb-6">Add a delivery address to speed up checkout</p>
          <button
            onClick={openAddForm}
            className="bg-neutral-900 text-white font-semibold px-8 py-3 rounded-full hover:bg-neutral-800 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} /> Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                addr.isDefault ? 'border-neutral-900 ring-1 ring-neutral-200' : 'border-neutral-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    addr.isDefault ? 'bg-neutral-900' : 'bg-neutral-100'
                  }`}>
                    <MapPin size={18} className={addr.isDefault ? 'text-white' : 'text-neutral-900'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-neutral-800 text-sm">
                        {addr.firstName} {addr.lastName}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        addr.type === 0
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {addr.type === 0 ? 'Shipping' : 'Billing'}
                      </span>
                      {addr.isDefault && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-900 flex items-center gap-1">
                          <Star size={10} fill="currentColor" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
                      {addr.street}, {addr.city}<br />
                      {addr.state} — {addr.postalCode}, {addr.country}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={settingDefaultId === addr.id}
                    className="text-xs font-semibold text-neutral-900 hover:text-neutral-950 flex items-center gap-1 px-3 py-1.5 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Star size={12} />
                    {settingDefaultId === addr.id ? 'Setting...' : 'Set as Default'}
                  </button>
                )}
                <button
                  onClick={() => openEditForm(addr)}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-3 py-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  disabled={deletingId === addr.id}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 ml-auto"
                >
                  <Trash2 size={12} />
                  {deletingId === addr.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
