'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cartApi, ordersApi, addressesApi, paymentMethodsApi } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import { CheckCircle, CreditCard, Truck, MapPin, Plus, Star, AlertCircle, Save } from 'lucide-react';
import { AddressDto, PaymentMethod } from '@/types';

function extractError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  const list = data.errors ?? data.Errors;
  const listMsg = Array.isArray(list) && list.length > 0
    ? list[0]
    : list && typeof list === 'object'
      ? (Object.values(list as Record<string, string[]>).flat()[0] ?? null)
      : null;
  return data.message ?? data.Message ?? listMsg ?? data.title ?? data.Title ?? fallback;
}

const PAYMENT_OPTIONS = [
  { type: 'CashOnDelivery', label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '💵' },
  { type: 'Card',           label: 'Credit / Debit Card', desc: 'Secured by Stripe',        icon: '💳' },
  { type: 'PayPal',         label: 'PayPal',              desc: 'Pay with your PayPal account', icon: '🅿️' },
];

const EMPTY_FORM = {
  firstName: '', lastName: '', street: '', city: '', state: '', postalCode: '', country: 'India', isDefault: false, type: 1,
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, setCart, clearCart } = useCartStore();
  const { isAuthenticated, initAuth, isInitialized } = useAuthStore();

  const [loading, setLoading]   = useState(true);
  const [placing, setPlacing]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [orderId, setOrderId]   = useState('');
  const [error, setError]       = useState('');

  const [addresses, setAddresses]             = useState<AddressDto[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showNewAddrForm, setShowNewAddrForm] = useState(false);
  const [newAddr, setNewAddr]                 = useState(EMPTY_FORM);
  const [addrErrors, setAddrErrors]           = useState<Record<string, string>>({});
  const [savingAddr, setSavingAddr]           = useState(false);
  const [addrSaveError, setAddrSaveError]     = useState('');

  const [paymentMethods, setPaymentMethods]     = useState<PaymentMethod[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState('CashOnDelivery');
  const [customerGST, setCustomerGST] = useState('');

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) { router.push('/auth/login'); return; }

    Promise.allSettled([
      cartApi.get(),
      addressesApi.getAll(),
      paymentMethodsApi.getAll(),
    ]).then(([cartRes, addrRes, pmRes]) => {
      if (cartRes.status === 'fulfilled') {
        setCart(cartRes.value.data?.data || cartRes.value.data);
      }
      if (addrRes.status === 'fulfilled') {
        const addrs: AddressDto[] = addrRes.value.data?.data || addrRes.value.data || [];
        setAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) setSelectedAddressId(def.id);
        else setShowNewAddrForm(true);
      }
      if (pmRes.status === 'fulfilled') {
        const pms: PaymentMethod[] = pmRes.value.data?.data || pmRes.value.data || [];
        setPaymentMethods(pms);
      }
      setLoading(false);
    });
  }, [isInitialized, isAuthenticated]);

  const subtotal = cart?.items?.reduce((s, i) => s + i.totalPrice, 0) || 0;
  const shipping = subtotal >= 1000 ? 0 : 50;
  const total    = subtotal + shipping;

  const validateAddr = () => {
    const e: Record<string, string> = {};
    if (!newAddr.firstName.trim()) e.firstName  = 'Required';
    if (!newAddr.lastName.trim())  e.lastName   = 'Required';
    if (!newAddr.street.trim())    e.street     = 'Required';
    if (!newAddr.city.trim())      e.city       = 'Required';
    if (!newAddr.state.trim())     e.state      = 'Required';
    if (!newAddr.postalCode.trim()) e.postalCode = 'Required';
    setAddrErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveAddress = async () => {
    setAddrSaveError('');
    if (!validateAddr()) return;
    setSavingAddr(true);
    try {
      const res = await addressesApi.create(newAddr);
      const created = res.data?.data || res.data;
      const newId: number = created?.AddressId || created?.addressId || created?.id;
      if (!newId) throw new Error('No address ID returned');

      const saved: AddressDto = {
        id: newId,
        firstName: newAddr.firstName,
        lastName: newAddr.lastName,
        street: newAddr.street,
        city: newAddr.city,
        state: newAddr.state,
        postalCode: newAddr.postalCode,
        country: newAddr.country,
        isDefault: newAddr.isDefault,
        type: newAddr.type,
      };
      setAddresses((prev) => [...prev, saved]);
      setSelectedAddressId(newId);
      setShowNewAddrForm(false);
      setNewAddr(EMPTY_FORM);
      setAddrErrors({});
    } catch (err: any) {
      setAddrSaveError(extractError(err, 'Failed to save address. Please try again.'));
    } finally {
      setSavingAddr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedAddressId) {
      setError('Please select or save a shipping address before placing your order.');
      return;
    }

    setPlacing(true);
    try {
      // Get or create payment method for the selected type
      let paymentMethodId: number | null = null;
      const existingPm = paymentMethods.find((pm) => pm.type === selectedPaymentType);
      if (existingPm) {
        paymentMethodId = existingPm.id;
      } else {
        const pmRes = await paymentMethodsApi.create({
          type: selectedPaymentType,
          isDefault: paymentMethods.length === 0,
        });
        const pmData = pmRes.data?.data || pmRes.data;
        paymentMethodId = pmData?.PaymentMethodId || pmData?.paymentMethodId || pmData?.id;
        if (!paymentMethodId) {
          setError('Failed to set up payment method. Please try again.');
          setPlacing(false);
          return;
        }
        setPaymentMethods((prev) => [
          ...prev,
          { id: paymentMethodId!, type: selectedPaymentType, userId: '', isDefault: false, createdAt: '' },
        ]);
      }

      const res = await ordersApi.create({
        shippingAddressId: selectedAddressId,
        paymentMethodId: paymentMethodId!,
        customerGSTIN: customerGST.trim().toUpperCase() || undefined,
      });

      const orderData = res.data?.data || res.data;
      setOrderId(orderData?.OrderNumber || orderData?.orderNumber || orderData?.OrderId || '');
      clearCart();
      setSuccess(true);
    } catch (err: any) {
      setError(extractError(err, 'Order placement failed. Please try again.'));
    } finally {
      setPlacing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Order Placed!</h2>
        <p className="text-gray-500 mb-2">Thank you for your order.</p>
        {orderId && (
          <p className="text-sm text-gray-500 mb-6">
            Order: <span className="font-semibold text-slate-700">{orderId}</span>
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/account/orders')}
            className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors"
          >
            Track Order
          </button>
          <button
            onClick={() => router.push('/products')}
            className="bg-white border border-gray-200 text-slate-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Shop More
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="bg-gray-200 rounded-2xl h-96" />
      </div>
    );
  }

  const fieldCls = (err: string) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${err ? 'border-amber-400 bg-amber-50' : 'border-gray-200 focus:border-orange-400'}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black text-slate-900 mb-6">Checkout</h1>

      {error && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-900 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — address & payment */}
          <div className="lg:col-span-2 space-y-5">

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MapPin size={16} className="text-orange-500" />
                </div>
                <h2 className="font-bold text-slate-900">Shipping Address</h2>
              </div>

              {/* Saved addresses */}
              <div className="space-y-2 mb-4">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedAddressId === addr.id && !showNewAddrForm
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id && !showNewAddrForm}
                      onChange={() => { setSelectedAddressId(addr.id); setShowNewAddrForm(false); setAddrSaveError(''); }}
                      className="accent-orange-500 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-slate-800">
                          {addr.firstName} {addr.lastName}
                        </p>
                        {addr.isDefault && (
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star size={9} fill="currentColor" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {addr.street}, {addr.city}, {addr.state} — {addr.postalCode}
                      </p>
                    </div>
                    {selectedAddressId === addr.id && !showNewAddrForm && (
                      <CheckCircle size={18} className="text-orange-500 flex-shrink-0" />
                    )}
                  </label>
                ))}

                {/* Add new address radio */}
                <label
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    showNewAddrForm
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={showNewAddrForm}
                    onChange={() => { setShowNewAddrForm(true); setSelectedAddressId(null); setAddrSaveError(''); }}
                    className="accent-orange-500"
                  />
                  <Plus size={16} className="text-orange-500" />
                  <span className="text-sm font-semibold text-slate-700">Add a new address</span>
                </label>
              </div>

              {/* New address form */}
              {showNewAddrForm && (
                <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/30 mt-2">
                  <p className="text-xs font-semibold text-orange-700 mb-3 uppercase tracking-wide">New Shipping Address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">First Name *</label>
                      <input value={newAddr.firstName} onChange={(e) => setNewAddr({ ...newAddr, firstName: e.target.value })}
                        placeholder="Enter first name" className={fieldCls(addrErrors.firstName)} />
                      {addrErrors.firstName && <p className="text-xs text-amber-700 mt-0.5">{addrErrors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Last Name *</label>
                      <input value={newAddr.lastName} onChange={(e) => setNewAddr({ ...newAddr, lastName: e.target.value })}
                        placeholder="Enter last name" className={fieldCls(addrErrors.lastName)} />
                      {addrErrors.lastName && <p className="text-xs text-amber-700 mt-0.5">{addrErrors.lastName}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Street Address *</label>
                      <input value={newAddr.street} onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                        placeholder="House no., street, area" className={fieldCls(addrErrors.street)} />
                      {addrErrors.street && <p className="text-xs text-amber-700 mt-0.5">{addrErrors.street}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">City *</label>
                      <input value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                        placeholder="Enter city" className={fieldCls(addrErrors.city)} />
                      {addrErrors.city && <p className="text-xs text-amber-700 mt-0.5">{addrErrors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">State *</label>
                      <input value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                        placeholder="Enter state" className={fieldCls(addrErrors.state)} />
                      {addrErrors.state && <p className="text-xs text-amber-700 mt-0.5">{addrErrors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Pincode *</label>
                      <input value={newAddr.postalCode} onChange={(e) => setNewAddr({ ...newAddr, postalCode: e.target.value })}
                        placeholder="6-digit pincode" className={fieldCls(addrErrors.postalCode)} />
                      {addrErrors.postalCode && <p className="text-xs text-amber-700 mt-0.5">{addrErrors.postalCode}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Country</label>
                      <input value={newAddr.country} readOnly
                        className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500" />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={newAddr.isDefault}
                        onChange={(e) => setNewAddr({ ...newAddr, isDefault: e.target.checked })}
                        className="accent-orange-500"
                      />
                      <label htmlFor="isDefault" className="text-sm text-slate-600 cursor-pointer select-none">
                        Set as default address
                      </label>
                    </div>
                  </div>

                  {addrSaveError && (
                    <p className="text-xs text-red-600 mt-3">{addrSaveError}</p>
                  )}

                  {/* Save Address button */}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={savingAddr}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                    >
                      <Save size={15} />
                      {savingAddr ? 'Saving...' : 'Save Address'}
                    </button>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewAddrForm(false);
                          setSelectedAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
                          setAddrErrors({});
                          setAddrSaveError('');
                          setNewAddr(EMPTY_FORM);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2.5 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <CreditCard size={16} className="text-orange-500" />
                </div>
                <h2 className="font-bold text-slate-900">Payment Method</h2>
              </div>
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map(({ type, label, desc, icon }) => (
                  <label
                    key={type}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPaymentType === type ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input type="radio" name="payment" value={type} checked={selectedPaymentType === type}
                      onChange={() => setSelectedPaymentType(type)} className="accent-orange-500" />
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    {paymentMethods.some((pm) => pm.type === type) && (
                      <span className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">Saved</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right — order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
              <h2 className="font-black text-slate-900 text-lg mb-4">Order Summary</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4 pr-1">
                {cart?.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-600">
                    <span className="truncate max-w-[60%]">{item.productName} × {item.quantity}</span>
                    <span className="font-medium">{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600' : ''}>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3 mb-5">
                <div className="flex justify-between font-black text-slate-900 text-lg">
                  <span>Total</span><span>{formatPrice(total)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes</p>
              </div>

              {/* Optional GST for business buyers */}
              <div className="mb-4 bg-slate-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-300 mb-2">Business Purchase? (Optional)</p>
                <input
                  type="text"
                  value={customerGST}
                  onChange={(e) => setCustomerGST(e.target.value.toUpperCase())}
                  placeholder="Enter your GSTIN to get a B2B tax invoice"
                  maxLength={15}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                />
                {customerGST && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(customerGST) && (
                  <p className="text-xs text-amber-400 mt-1">Invalid GSTIN format — e.g. 27ABCDE1234F1Z5</p>
                )}
                {customerGST && /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(customerGST) && (
                  <p className="text-xs text-green-400 mt-1">✓ Your GSTIN will appear on the invoice</p>
                )}
              </div>

              {showNewAddrForm && !selectedAddressId ? (
                <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 font-bold py-4 rounded-xl text-sm cursor-not-allowed select-none">
                  <Truck size={18} />
                  Save address first
                </div>
              ) : (
                <button type="submit" disabled={placing}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors">
                  <Truck size={18} />
                  {placing ? 'Placing Order...' : 'Place Order'}
                </button>
              )}

              <p className="text-xs text-gray-400 text-center mt-3">
                By placing your order, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
