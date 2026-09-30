'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Order, ORDER_STATUS } from '@/types';
import { formatPrice, getImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { Package, ChevronRight, ArrowLeft } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  Pending:    'bg-yellow-100 text-yellow-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped:    'bg-purple-100 text-purple-700',
  Delivered:  'bg-green-100 text-green-700',
  Cancelled:  'bg-red-100 text-red-700',
  Refunded:   'bg-neutral-100 text-neutral-600',
  Returned:   'bg-neutral-100 text-neutral-900',
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    ordersApi.getAll()
      .then((r) => {
        const data = r.data?.data || r.data;
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const getStatusLabel = (status: number | string) => {
    if (typeof status === 'number') return ORDER_STATUS[status] || 'Unknown';
    return status;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account" className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-neutral-700" />
        </Link>
        <h1 className="font-display tracking-tight text-2xl text-neutral-900">My Orders</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-neutral-200 rounded-2xl h-24 animate-pulse" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusLabel = getStatusLabel(order.status);
            return (
              <Link key={`${order.vendorId}-${order.id}`} href={`/account/orders/${order.id}`}>
                <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm hover:shadow-md hover:border-neutral-200 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100 border border-neutral-100">
                        {order.items?.[0]?.productImageUrl ? (
                          <Image
                            src={getImageUrl(order.items[0].productImageUrl)}
                            alt={order.items[0].productName || 'Product'}
                            width={56} height={56}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={20} className="text-neutral-900" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-800 text-sm">
                          Order #{order.orderNumber || String(order.id).slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {order.items?.length || 0} items &bull; {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-neutral-900">{formatPrice(order.totalAmount)}</p>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-1 inline-block ${STATUS_COLORS[statusLabel] || 'bg-neutral-100 text-neutral-600'}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-neutral-400 flex-shrink-0" />
                    </div>
                  </div>
                  {order.items?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-100">
                      <p className="text-xs text-neutral-500">
                        {order.items.slice(0, 2).map((i) => i.productName || 'Product').join(', ')}
                        {order.items.length > 2 && ` +${order.items.length - 2} more`}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-neutral-50 border border-neutral-100 grid place-items-center"><Package className="h-7 w-7 text-neutral-400" strokeWidth={1.6} /></div>
          <h3 className="text-xl font-semibold text-neutral-800 mb-2">No orders yet</h3>
          <p className="text-neutral-500 mb-5">Start shopping to see your orders here</p>
          <Link href="/products" className="bg-neutral-900 text-white font-semibold px-8 py-3 rounded-full hover:bg-neutral-800 transition-colors inline-block">
            Shop Now
          </Link>
        </div>
      )}
    </div>
  );
}
