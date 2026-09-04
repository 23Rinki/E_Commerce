'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Order, ORDER_STATUS } from '@/types';
import { formatPrice } from '@/lib/utils';
import {
  Package, ArrowLeft, CheckCircle, Clock, Truck, XCircle,
  RefreshCw, RotateCcw, AlertCircle, MapPin, FileText, Loader2,
} from 'lucide-react';
import api from '@/lib/api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Pending:    { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  Processing: { color: 'text-blue-700',   bg: 'bg-blue-100',   icon: RefreshCw },
  Shipped:    { color: 'text-purple-700', bg: 'bg-purple-100', icon: Truck },
  Delivered:  { color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
  Cancelled:  { color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
  Refunded:   { color: 'text-gray-700',   bg: 'bg-gray-100',   icon: RefreshCw },
  Returned:   { color: 'text-orange-700', bg: 'bg-orange-100', icon: RotateCcw },
};

const STATUS_ORDER = ['Pending', 'Processing', 'Shipped', 'Delivered'];

interface TrackingStep {
  previousStatus: string;
  newStatus: string;
  updatedBy: string;
  comment: string;
  createdAt: string;
}

interface TrackingData {
  orderNumber: string;
  currentStatus: string;
  statusHistory: TrackingStep[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();
  const [order, setOrder]       = useState<Order | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setInvoiceLoading(true);
    try {
      const res = await api.get(`/api/invoices/generate/${order.id}`, {
        responseType: 'text',
        headers: { Accept: 'text/html' },
      });
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(res.data as string);
        win.document.write(`
          <style>
            #__printBtn { position: fixed; top: 16px; right: 16px; z-index: 9999;
              padding: 10px 20px; background: #1a1a6e; color: #fff; border: none;
              border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            @media print { #__printBtn { display: none; } }
          </style>
          <button id="__printBtn" onclick="window.print()">Print Invoice</button>
        `);
        win.document.close();
      }
    } catch {
      alert('Could not generate invoice. Please try again later.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!id) return;

    Promise.allSettled([
      ordersApi.getById(id),
      ordersApi.getTracking(Number(id)),
    ]).then(([orderRes, trackRes]) => {
      if (orderRes.status === 'fulfilled') {
        const data = orderRes.value.data?.data || orderRes.value.data;
        setOrder(data);
      }
      if (trackRes.status === 'fulfilled') {
        const data = trackRes.value.data?.data || trackRes.value.data;
        setTracking(data);
      }
      setLoading(false);
    });
  }, [id, isAuthenticated]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    setCancelError('');
    try {
      await ordersApi.cancel(order.id, order.vendorId);
      setOrder((o) => o ? { ...o, status: 5 } : o);
      // Refresh tracking after cancel
      const tr = await ordersApi.getTracking(order.id);
      const data = tr.data?.data || tr.data;
      setTracking(data);
    } catch (err: any) {
      setCancelError(err?.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="bg-gray-200 rounded-2xl h-28" />
        <div className="bg-gray-200 rounded-2xl h-48" />
        <div className="bg-gray-200 rounded-2xl h-32" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
        <p className="text-xl text-gray-500 mb-4">Order not found.</p>
        <Link href="/account/orders" className="text-orange-500 font-semibold">← Back to Orders</Link>
      </div>
    );
  }

  const statusLabel  = ORDER_STATUS[order.status] || String(order.status);
  const cfg          = STATUS_CONFIG[statusLabel] || STATUS_CONFIG['Pending'];
  const StatusIcon   = cfg.icon;
  const canCancel    = order.status === 1 || order.status === 2;
  const isCancelled  = statusLabel === 'Cancelled';

  // Build the visual progress steps (only for non-cancelled orders)
  const progressSteps = STATUS_ORDER.map((s) => ({
    label: s,
    done: !isCancelled && STATUS_ORDER.indexOf(statusLabel) >= STATUS_ORDER.indexOf(s),
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account/orders" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Order Details</h1>
          <p className="text-sm text-gray-500">#{order.orderNumber || order.id}</p>
        </div>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl p-5 mb-5 ${cfg.bg} border border-current/10`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center">
            <StatusIcon size={20} className={cfg.color} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Status</p>
            <p className={`text-lg font-black ${cfg.color}`}>{statusLabel}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500">Placed on</p>
            <p className="text-sm font-semibold text-slate-700">
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Progress stepper — hidden for cancelled orders */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5">
          <div className="flex items-center justify-between">
            {progressSteps.map((step, i) => {
              const StepIcon = STATUS_CONFIG[step.label]?.icon || Clock;
              return (
                <div key={step.label} className="flex flex-col items-center flex-1 relative">
                  {/* Connector line */}
                  {i < progressSteps.length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      progressSteps[i + 1].done ? 'bg-orange-400' : 'bg-gray-200'
                    }`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                    step.done ? 'bg-orange-500' : 'bg-gray-100'
                  }`}>
                    <StepIcon size={15} className={step.done ? 'text-white' : 'text-gray-400'} />
                  </div>
                  <p className={`text-xs mt-1.5 font-semibold text-center ${step.done ? 'text-orange-600' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Track Order — status history timeline */}
      {tracking && tracking.statusHistory && tracking.statusHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-orange-500" /> Track Order
          </h2>
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />

            {[...tracking.statusHistory].reverse().map((step, i) => {
              const statusCfg = STATUS_CONFIG[step.newStatus] || STATUS_CONFIG['Pending'];
              const StepIcon  = statusCfg.icon;
              return (
                <div key={i} className="relative mb-5 last:mb-0">
                  {/* Dot */}
                  <div className={`absolute -left-[18px] w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                    i === 0 ? 'bg-orange-500' : 'bg-gray-300'
                  }`}>
                    <StepIcon size={9} className={i === 0 ? 'text-white' : 'text-gray-500'} />
                  </div>
                  <div className={`rounded-xl p-3 ${i === 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-sm font-bold ${i === 0 ? 'text-orange-700' : 'text-slate-700'}`}>
                        {step.newStatus}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(step.createdAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {step.comment && (
                      <p className="text-xs text-gray-500">{step.comment}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Package size={18} className="text-orange-500" /> Items Ordered
        </h2>
        <div className="divide-y divide-gray-100">
          {order.items?.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={16} className="text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800 line-clamp-1">{item.productName}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatPrice(item.unitPrice)}</p>
                </div>
              </div>
              <span className="font-bold text-slate-900 flex-shrink-0">{formatPrice(item.totalPrice)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5">
        <h2 className="font-bold text-slate-900 mb-4">Price Breakdown</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{formatPrice(order.subTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span><span>{formatPrice(order.taxAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span className={order.shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
              {order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-slate-900 text-base">
            <span>Total</span><span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Download Invoice */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <FileText size={18} className="text-orange-500" /> Invoice
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Download a GST-compliant tax invoice for this order. You can print it or save it as a PDF.
        </p>
        <button
          onClick={handleDownloadInvoice}
          disabled={invoiceLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {invoiceLoading
            ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
            : <><FileText size={15} /> Download Invoice</>}
        </button>
      </div>

      {/* Cancel button */}
      {canCancel && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          {cancelError && (
            <p className="text-sm text-red-600 mb-3">{cancelError}</p>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full border-2 border-red-200 text-red-500 hover:bg-red-50 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Order'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Orders can only be cancelled when Pending or Processing
          </p>
        </div>
      )}
    </div>
  );
}
