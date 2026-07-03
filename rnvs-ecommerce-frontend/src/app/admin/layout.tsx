'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, BarChart2, Settings, ChevronRight, Shield, LogOut, ImageOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const NAV = [
  { href: '/admin/vendors', label: 'Vendors', icon: Users },
  { href: '/admin/products', label: 'Products', icon: ImageOff },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-52 bg-slate-900 flex flex-col fixed top-0 left-0 h-full z-30">
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-orange-400" />
            <span className="text-white font-black text-base">Platform Admin</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">inovativeai.com</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${active ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={13} className="ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-slate-700 space-y-2">
          <Link href="/" className="text-xs text-slate-500 hover:text-orange-400 transition-colors block">
            ← Back to Store
          </Link>
          <button
            onClick={() => { logout(); window.location.href = '/'; }}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors w-full"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-52 min-h-screen">{children}</main>
    </div>
  );
}
