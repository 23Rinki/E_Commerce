'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import {
  Package, ShoppingBag, BarChart2, Users,
  FileText, Settings, ChevronRight,
} from 'lucide-react';

const OPTIONS = [
  {
    href: '/vendor/products',
    icon: Package,
    label: 'Products',
    caption: 'Add, edit and manage your product catalogue. Set prices, descriptions and stock levels.',
    color: 'bg-blue-100 text-blue-600',
    iconColor: 'text-blue-500',
  },
  {
    href: '/vendor/orders',
    icon: ShoppingBag,
    label: 'Orders',
    caption: 'View incoming orders, update status and handle customer purchases.',
    color: 'bg-green-100 text-green-600',
    iconColor: 'text-green-500',
  },
  {
    href: '/vendor/inventory',
    icon: BarChart2,
    label: 'Inventory',
    caption: 'Track stock levels across your products and get low-stock alerts.',
    color: 'bg-purple-100 text-purple-600',
    iconColor: 'text-purple-500',
  },
  {
    href: '/vendor/employees',
    icon: Users,
    label: 'Employees',
    caption: 'Add team members and assign roles to manage your store together.',
    color: 'bg-amber-100 text-amber-600',
    iconColor: 'text-amber-500',
  },
  {
    href: '/vendor/receipts',
    icon: FileText,
    label: 'Receipts',
    caption: 'Upload your store logo and set your store details. Printed on every receipt delivered with your orders.',
    color: 'bg-pink-100 text-pink-600',
    iconColor: 'text-pink-500',
  },
  {
    href: '/vendor/settings',
    icon: Settings,
    label: 'Settings',
    caption: 'Update your store name, contact details and account preferences.',
    color: 'bg-gray-200 text-gray-600',
    iconColor: 'text-gray-500',
  },
];

export default function VendorDashboardPage() {
  const { user } = useAuthStore();
  const { designation } = useVendorStore();
  useVendorAccess('dashboard', designation);

  return (
    <div className="p-6 max-w-6xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">
          Welcome, {user?.firstName || 'Seller'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          What would you like to manage today?
        </p>
      </div>

      {/* Option cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {OPTIONS.map(({ href, icon: Icon, label, caption, color, iconColor }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={22} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 group-hover:text-slate-700">{label}</p>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{caption}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
