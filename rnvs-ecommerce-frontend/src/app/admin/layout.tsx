'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, BarChart2, Settings, LogOut, ImageOff, ArrowLeft, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const NAV = [
  { href: '/admin/vendors',   label: 'Vendors',   icon: Users },
  { href: '/admin/products',  label: 'Products',  icon: ImageOff },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/settings',  label: 'Settings',  icon: Settings },
];

const ADMIN_ROLES = [4, 5]; // Admin, SuperAdmin

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, initAuth, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { initAuth(); }, [initAuth]);

  const isAdmin = isAuthenticated && ADMIN_ROLES.includes(Number(user?.role));

  // Anyone who isn't an admin gets sent to sign in (the API enforces this too; this keeps the UI honest)
  useEffect(() => {
    if (isInitialized && !isAdmin) router.replace(`/auth/login?returnUrl=${encodeURIComponent(pathname)}`);
  }, [isInitialized, isAdmin, pathname, router]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (!isInitialized || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin" />
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-neutral-500">Checking access</p>
        </div>
      </div>
    );
  }

  const nav = (
    <>
      <nav className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 mb-3 text-[11px] uppercase tracking-[0.3em] text-neutral-500">Manage</div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 h-11 rounded-full text-sm font-medium transition-colors
                ${active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-neutral-100 space-y-1">
        <div className="px-3 pb-3">
          <p className="text-sm font-medium text-neutral-900 truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
        </div>
        <Link href="/" className="flex items-center gap-2 px-3 h-10 rounded-full text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 transition-colors">
          <ArrowLeft size={15} /> Back to store
        </Link>
        <button
          onClick={() => { logout(); window.location.href = '/'; }}
          className="flex items-center gap-2 px-3 h-10 rounded-full text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  );

  const brand = (
    <Link href="/admin/vendors" className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-full bg-neutral-900 grid place-items-center text-white font-display text-sm">R</div>
      <div>
        <div className="font-display text-lg leading-none tracking-tight text-neutral-900">RNVS CommerceX</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mt-1">Platform admin</div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-neutral-50/60">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-neutral-100 flex-col fixed inset-y-0 left-0 z-30">
        <div className="px-6 h-20 flex items-center border-b border-neutral-100">{brand}</div>
        {nav}
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-neutral-100 h-16 px-4 flex items-center justify-between">
        {brand}
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="h-10 w-10 grid place-items-center rounded-full hover:bg-neutral-100">
          <Menu size={20} />
        </button>
      </header>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white flex flex-col shadow-2xl">
            <div className="px-5 h-16 flex items-center justify-between border-b border-neutral-100">
              {brand}
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="h-10 w-10 grid place-items-center rounded-full hover:bg-neutral-100">
                <X size={20} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <main className="lg:ml-64 min-h-screen">{children}</main>
    </div>
  );
}
