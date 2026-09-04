'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, BarChart2,
  Users, FileText, Settings, LogOut, Home, UserCircle, Landmark,
  Receipt, PieChart, Truck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useVendorStore } from '@/store/vendorStore';
import { employeeApi } from '@/lib/api';
import { ROLES, getAllowedSlugs } from '@/lib/permissions';

const ALL_NAV = [
  { href: '/vendor/dashboard',  slug: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard, color: 'text-indigo-500' },
  { href: '/vendor/products',   slug: 'products',   label: 'Products',      icon: Package,         color: 'text-blue-500' },
  { href: '/vendor/orders',     slug: 'orders',     label: 'Orders',        icon: ShoppingBag,     color: 'text-green-500' },
  { href: '/vendor/inventory',  slug: 'inventory',  label: 'Inventory',     icon: BarChart2,       color: 'text-purple-500' },
  { href: '/vendor/employees',  slug: 'employees',  label: 'Employees',     icon: Users,           color: 'text-amber-500' },
  { href: '/vendor/receipts',   slug: 'receipts',   label: 'Receipts',      icon: FileText,        color: 'text-pink-500' },
  { href: '/vendor/invoices',   slug: 'invoices',   label: 'Invoices',      icon: Receipt,         color: 'text-orange-500' },
  { href: '/vendor/reports',    slug: 'reports',    label: 'Reports',       icon: PieChart,        color: 'text-teal-500' },
  { href: '/vendor/profile',       slug: 'profile',       label: 'My Profile',    icon: UserCircle, color: 'text-cyan-500' },
  { href: '/vendor/bank-account',  slug: 'bank-account',  label: 'Bank Account',  icon: Landmark,   color: 'text-emerald-500' },
  { href: '/vendor/shipping',       slug: 'shipping',       label: 'Shipping',      icon: Truck,    color: 'text-sky-500' },
  { href: '/vendor/settings',      slug: 'settings',      label: 'Settings',      icon: Settings,   color: 'text-slate-500' },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { logout, user, initAuth } = useAuthStore();

  const { designation, setDesignation } = useVendorStore();
  const [loadingRole, setLoadingRole] = useState(false);

  const isEmployee = Number(user?.role) === ROLES.Employee;
  const isVendor   = Number(user?.role) === ROLES.Vendor;

  useEffect(() => { initAuth(); }, [initAuth]);

  // Fetch employee record if logged in as employee
  useEffect(() => {
    if (!isEmployee) return;
    setLoadingRole(true);
    employeeApi.getMe()
      .then((r) => {
        const d = r.data?.data || r.data;
        setDesignation(d?.designation ?? null);
      })
      .catch(() => setDesignation(null))
      .finally(() => setLoadingRole(false));
  }, [isEmployee]);

  // Build the nav items visible to this user
  const allowedSlugs = isEmployee && designation
    ? getAllowedSlugs(designation)
    : isVendor
      ? ALL_NAV.map((n) => n.slug)   // vendor sees everything
      : ['dashboard'];               // fallback

  const nav = ALL_NAV.filter((n) => allowedSlugs.includes(n.slug));

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col fixed top-0 left-0 h-full z-30">
        <div className="px-5 pt-6 pb-4 border-b border-stone-100">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500 font-medium">
            {isEmployee ? `${designation ?? 'Employee'} Portal` : 'Seller Portal'}
            <span className="text-stone-300 mx-1">·</span>{' '}
            <span className="text-stone-900 font-semibold normal-case tracking-normal">{user?.firstName}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {loadingRole ? (
            <div className="px-3 py-8 text-center">
              <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <ul className="space-y-0.5">
              {nav.map(({ href, label, icon: Icon, color }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <li key={href} className="relative">
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-stone-900" />
                    )}
                    <Link
                      href={href}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-all
                        ${active ? 'bg-stone-100 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 transition-colors ${color}`}
                        strokeWidth={1.75}
                      />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Divider */}
          <div className="my-3 mx-3 h-px bg-stone-100" />

          {/* Back to Home */}
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all"
          >
            <Home
              className="h-5 w-5 shrink-0 text-stone-500 group-hover:text-stone-800 group-hover:-translate-x-0.5 transition-all"
              strokeWidth={1.75}
            />
            <span>Back to Home</span>
          </Link>

          {/* Role badge for employees */}
          {isEmployee && designation && (
            <div className="mt-3 mx-3 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg w-fit">
              <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">{designation}</p>
            </div>
          )}
        </nav>

        <div className="px-5 py-4 border-t border-stone-100 text-[11px] text-stone-400">
          © 2026 RNVS Inovative AI LLP
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="h-12 bg-slate-900 flex items-center justify-end px-6 flex-shrink-0">
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
