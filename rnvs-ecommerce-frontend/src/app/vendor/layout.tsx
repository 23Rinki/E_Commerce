'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, BarChart2,
  Users, FileText, Settings, ChevronRight, LogOut, Home, UserCircle, Landmark,
  Receipt, PieChart, Truck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useVendorStore } from '@/store/vendorStore';
import { employeeApi } from '@/lib/api';
import { ROLES, getAllowedSlugs } from '@/lib/permissions';

const ALL_NAV = [
  { href: '/vendor/dashboard',  slug: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/vendor/products',   slug: 'products',   label: 'Products',      icon: Package },
  { href: '/vendor/orders',     slug: 'orders',     label: 'Orders',        icon: ShoppingBag },
  { href: '/vendor/inventory',  slug: 'inventory',  label: 'Inventory',     icon: BarChart2 },
  { href: '/vendor/employees',  slug: 'employees',  label: 'Employees',     icon: Users },
  { href: '/vendor/receipts',   slug: 'receipts',   label: 'Receipts',      icon: FileText },
  { href: '/vendor/invoices',   slug: 'invoices',   label: 'Invoices',      icon: Receipt },
  { href: '/vendor/reports',    slug: 'reports',    label: 'Reports',       icon: PieChart },
  { href: '/vendor/profile',       slug: 'profile',       label: 'My Profile',    icon: UserCircle },
  { href: '/vendor/bank-account',  slug: 'bank-account',  label: 'Bank Account',  icon: Landmark },
  { href: '/vendor/shipping',       slug: 'shipping',       label: 'Shipping',      icon: Truck },
  { href: '/vendor/settings',      slug: 'settings',      label: 'Settings',      icon: Settings },
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
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 h-full z-30">
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="text-lg font-black text-slate-900">RNVS</span>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">
            {isEmployee ? `${designation ?? 'Employee'} Portal` : 'Seller Portal'} · {user?.firstName}
          </p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {loadingRole ? (
            <div className="px-3 py-8 text-center">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                    ${active ? 'bg-slate-100 text-slate-900' : 'text-gray-500 hover:bg-gray-50 hover:text-slate-800'}`}
                >
                  <Icon size={17} className={active ? 'text-slate-700' : 'text-gray-400 group-hover:text-slate-600'} />
                  {label}
                  {active && <ChevronRight size={14} className="ml-auto text-slate-400" />}
                </Link>
              );
            })
          )}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
          <Link href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-slate-700 transition-colors">
            <Home size={15} /> Back to Home
          </Link>
          {/* Role badge for employees */}
          {isEmployee && designation && (
            <div className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">{designation}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56 min-h-screen flex flex-col">
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
