'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Users, Pencil, Trash2, CheckCircle2, AlertCircle, Phone, MapPin, Shield, Eye, EyeOff } from 'lucide-react';
import { employeeApi } from '@/lib/api';
import { DESIGNATION_ACCESS } from '@/lib/permissions';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';

const DESIGNATIONS = ['Manager', 'Sales Staff', 'Support', 'Cashier', 'Warehouse Staff', 'Delivery Staff'];


const DESIGNATION_COLORS: Record<string, string> = {
  'Manager':         'bg-indigo-100 text-indigo-700',
  'Sales Staff':     'bg-blue-100 text-blue-700',
  'Support':         'bg-purple-100 text-purple-700',
  'Cashier':         'bg-amber-100 text-amber-700',
  'Warehouse Staff': 'bg-orange-100 text-orange-700',
  'Delivery Staff':  'bg-green-100 text-green-700',
};

const PAGE_ACCESS_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', products: 'Products', orders: 'Orders',
  inventory: 'Inventory', employees: 'Employees', receipts: 'Receipts', settings: 'Settings',
};

interface Employee {
  id: number;
  employeeName: string;
  email: string;
  designation: string;
  phoneNumber: string;
  city?: string;
  state?: string;
  joinedDate: string;
  isActive: boolean;
  notes?: string;
}

interface Form {
  firstName: string; lastName: string;
  email: string; password: string;
  designation: string; phoneNumber: string;
  country: string; city: string; state: string; notes: string;
}

const EMPTY: Form = {
  firstName: '', lastName: '',
  email: '', password: '',
  designation: 'Sales Staff', phoneNumber: '', country: 'India', city: '', state: '', notes: '',
};

const inp = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition-colors bg-white';

function initials(name: string) {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export default function EmployeesPage() {
  const { designation } = useVendorStore();
  useVendorAccess('employees', designation);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Employee | null>(null);   // null = add mode
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [allStates, setAllStates] = useState<string[]>([]);
  // Ref so city onChange always reads the latest country without stale closure
  const countryRef = useRef('India');

  // Pre-load states for default country (India)
  useEffect(() => {
    fetch('/api/places/states?country=India').then(r => r.json()).then(setAllStates).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await employeeApi.getAll();
      const data = r.data?.data ?? r.data ?? [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const f = (k: keyof Form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const resetForm = () => {
    countryRef.current = 'India';
    setForm(EMPTY);
    setEditing(null);
    setShowPass(false);
  };

  const startEdit = (emp: Employee) => {
    const [first = '', ...rest] = emp.employeeName.split(' ');
    setForm({
      firstName: first, lastName: rest.join(' '),
      email: emp.email, password: '',
      designation: emp.designation,
      phoneNumber: emp.phoneNumber,
      country: 'India', city: emp.city || '', state: emp.state || '', notes: emp.notes || '',
    });
    setEditing(emp);
    setSuccessMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!form.firstName || !form.email || !form.phoneNumber || (!editing && !form.password)) {
      setErrorMsg('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      if (!editing) {
        await employeeApi.create({
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, password: form.password,
          designation: form.designation, phoneNumber: form.phoneNumber,
          city: form.city || undefined, state: form.state || undefined,
          notes: form.notes || undefined,
        });
        setSuccessMsg(`${form.firstName} ${form.lastName} added successfully!`);
        resetForm();
      } else {
        await employeeApi.update(editing.id, {
          designation: form.designation, phoneNumber: form.phoneNumber,
          city: form.city || undefined, state: form.state || undefined,
          notes: form.notes || undefined,
        });
        setSuccessMsg(`${editing.employeeName} updated!`);
        resetForm();
      }
      await load();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Remove ${emp.employeeName} from your team?`)) return;
    try {
      await employeeApi.remove(emp.id);
      setSuccessMsg(`${emp.employeeName} removed.`);
      if (editing?.id === emp.id) resetForm();
      await load();
    } catch {
      setErrorMsg('Failed to remove employee.');
    }
  };

  const handleToggle = async (emp: Employee) => {
    try {
      await employeeApi.update(emp.id, { isActive: !emp.isActive });
      await load();
    } catch {
      setErrorMsg('Failed to update status.');
    }
  };

  // Preview
  const previewName = `${form.firstName || 'First'} ${form.lastName || 'Last'}`;
  const previewAccess = DESIGNATION_ACCESS[form.designation] || [];
  const badge = DESIGNATION_COLORS[form.designation] || 'bg-slate-100 text-slate-600';

  return (
    <div className="p-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add team members and preview their access in real time.</p>
        </div>
        {editing && (
          <button onClick={resetForm}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            <Plus size={14} /> Add New Employee
          </button>
        )}
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <CheckCircle2 size={16} className="text-green-600" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-900 font-medium">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-amber-500 hover:text-amber-700 text-lg leading-none">×</button>
        </div>
      )}

      {/* Split layout — form + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-bold text-slate-900 mb-4">
            {editing ? `Editing — ${editing.employeeName}` : 'Add New Employee'}
          </p>

          <div className="space-y-3">
            {/* Name + Email + Password — only shown when adding */}
            {!editing && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">First name <span className="text-orange-400">*</span></label>
                    <input value={form.firstName} onChange={e => f('firstName', e.target.value)} className={inp} placeholder="John" autoComplete="off" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Last name</label>
                    <input value={form.lastName} onChange={e => f('lastName', e.target.value)} className={inp} placeholder="Doe" autoComplete="off" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email <span className="text-orange-400">*</span></label>
                  {/* autoComplete="new-password" tricks browsers into not filling saved credentials */}
                  <input type="email" value={form.email} onChange={e => f('email', e.target.value)}
                    className={inp} placeholder="employee@yourstore.com"
                    autoComplete="new-password" name="employee-email" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Password <span className="text-orange-400">*</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => f('password', e.target.value)}
                      className={`${inp} pr-10`} placeholder="Min. 6 characters"
                      autoComplete="new-password" name="employee-password" />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">The employee uses this to log in.</p>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Role / Designation <span className="text-orange-400">*</span></label>
              <select value={form.designation} onChange={e => f('designation', e.target.value)} className={inp}>
                {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Phone <span className="text-orange-400">*</span></label>
              <input type="tel" value={form.phoneNumber} onChange={e => f('phoneNumber', e.target.value)} className={inp} placeholder="+91 98765 43210" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Country</label>
              <input
                value={form.country}
                onChange={e => {
                  const val = e.target.value;
                  countryRef.current = val;           // keep ref in sync immediately
                  f('country', val);
                  f('city', '');
                  f('state', '');
                  setCitySuggestions([]);
                  setStateSuggestions([]);
                  setAllStates([]);
                  // Fetch states for the new country as user types (min 3 chars)
                  if (val.trim().length >= 3) {
                    fetch(`/api/places/states?country=${encodeURIComponent(val.trim())}`)
                      .then(r => r.json()).then(setAllStates).catch(() => {});
                  }
                }}
                className={inp} placeholder="India" autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">City</label>
                <input
                  value={form.city}
                  onChange={e => {
                    f('city', e.target.value);
                    const q = e.target.value.trim();
                    if (q.length >= 1) {
                      // Use ref — always has the latest country even before React re-renders
                      const country = encodeURIComponent(countryRef.current.trim());
                      fetch(`/api/places/cities?q=${encodeURIComponent(q)}&country=${country}`)
                        .then(r => r.json()).then(setCitySuggestions).catch(() => {});
                    } else {
                      setCitySuggestions([]);
                    }
                  }}
                  onBlur={() => setTimeout(() => setCitySuggestions([]), 150)}
                  className={inp} placeholder="Mumbai" autoComplete="off"
                />
                {citySuggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden text-sm">
                    {citySuggestions.map(c => (
                      <li key={c} onMouseDown={() => { f('city', c); setCitySuggestions([]); }}
                        className="px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors">
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="relative">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">State</label>
                <input
                  value={form.state}
                  onChange={e => {
                    f('state', e.target.value);
                    const q = e.target.value.trim().toLowerCase();
                    setStateSuggestions(
                      q.length >= 1 ? allStates.filter(s => s.toLowerCase().startsWith(q)).slice(0, 6) : []
                    );
                  }}
                  onBlur={() => setTimeout(() => setStateSuggestions([]), 150)}
                  className={inp} placeholder="Maharashtra" autoComplete="off"
                />
                {stateSuggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden text-sm">
                    {stateSuggestions.map(s => (
                      <li key={s} onMouseDown={() => { f('state', s); setStateSuggestions([]); }}
                        className="px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
                className={`${inp} resize-none`} rows={2} placeholder="Any additional notes..." />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            {editing && (
              <button onClick={resetForm}
                className="px-4 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            )}
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </div>

        {/* RIGHT — Preview */}
        <div className="sticky top-6 self-start">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-slate-900 mb-4">Employee Preview</p>

            {!form.firstName ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Users size={22} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Start filling the form to see a live preview.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Avatar */}
                <div className="bg-gradient-to-br from-indigo-50 to-slate-50 px-5 py-6 text-center border-b border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-3 text-white font-black text-xl">
                    {initials(previewName)}
                  </div>
                  <p className="font-black text-slate-900 text-base">{previewName}</p>
                  <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                    {form.designation}
                  </span>
                </div>

                {/* Details */}
                <div className="px-5 py-4 space-y-2.5">
                  {form.phoneNumber && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{form.phoneNumber}</span>
                    </div>
                  )}
                  {(form.city || form.state) && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{[form.city, form.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Access */}
                <div className="px-5 pb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield size={13} className="text-gray-400" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal Access</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(PAGE_ACCESS_LABELS).map(slug => (
                      <span key={slug}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border
                          ${previewAccess.includes(slug)
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                        {PAGE_ACCESS_LABELS[slug]}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 italic">Access updates when you change the role.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Your Team ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Your Team
            {employees.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-full">
                {employees.length}
              </span>
            )}
          </h2>
          <button onClick={load} className="text-xs text-gray-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-100 rounded-2xl flex items-center justify-center h-32">
            <RefreshCw size={18} className="animate-spin text-gray-400" />
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No team members yet</p>
            <p className="text-xs text-gray-400 mt-1">Fill in the form above to add your first employee.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => (
                  <tr key={emp.id}
                    className={`transition-colors ${editing?.id === emp.id ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                          {initials(emp.employeeName)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{emp.employeeName}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${DESIGNATION_COLORS[emp.designation] || 'bg-slate-100 text-slate-600'}`}>
                        {emp.designation}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{emp.phoneNumber}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell">
                      {new Date(emp.joinedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleToggle(emp)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors
                          ${emp.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(emp)} title="Edit"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(emp)} title="Remove"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
