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
  Refunded:   'bg-gray-100 text-gray-600',
  Returned:   'bg-orange-100 text-orange-700',
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
        <Link href="/account" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900">My Orders</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-gray-200 rounded-2xl h-24 animate-pulse" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusLabel = getStatusLabel(order.status);
            return (
              <Link key={`${order.vendorId}-${order.id}`} href={`/account/orders/${order.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
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
                            <Package size={20} className="text-orange-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          Order #{order.orderNumber || String(order.id).slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.items?.length || 0} items &bull; {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-black text-slate-900">{formatPrice(order.totalAmount)}</p>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-1 inline-block ${STATUS_COLORS[statusLabel] || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                  {order.items?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
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
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No orders yet</h3>
          <p className="text-gray-500 mb-5">Start shopping to see your orders here</p>
          <Link href="/products" className="bg-orange-500 text-white font-bold px-8 py-3 rounded-full hover:bg-orange-600 transition-colors inline-block">
            Shop Now
          </Link>
        </div>
      )}
    </div>
  );
}
