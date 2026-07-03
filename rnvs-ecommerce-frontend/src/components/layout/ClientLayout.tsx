'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import LoginModal from '@/components/auth/LoginModal';
import { useUIStore } from '@/store/uiStore';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth   = pathname.startsWith('/auth');
  const isAdmin  = pathname.startsWith('/admin');
  const isVendor = pathname.startsWith('/vendor');
  const isSell   = pathname.startsWith('/sell');
  const { loginModalOpen } = useUIStore();
  const hideShell = isAuth || isAdmin || isVendor || isSell;

  return (
    <>
      {!hideShell && <Navbar />}
      <main className="flex-1">{children}</main>
      {!hideShell && <Footer />}
      {loginModalOpen && <LoginModal />}
    </>
  );
}
