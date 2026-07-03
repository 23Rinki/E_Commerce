'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ROLES, canAccess } from '@/lib/permissions';

/**
 * Call this at the top of any vendor page to enforce access control.
 * - Vendors always pass.
 * - Employees are checked against their designation.
 * - Anyone else is redirected away.
 *
 * @param slug  The page slug to check (e.g. 'products', 'orders')
 * @param designation  The employee's designation (null while loading — hook waits)
 */
export function useVendorAccess(slug: string, designation: string | null | undefined) {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return; // wait for initAuth to finish before redirecting

    const role = Number(user?.role);

    // Not logged in at all
    if (!user) { router.replace('/'); return; }

    // Admin / SuperAdmin shouldn't be here
    if (role === ROLES.Admin || role === ROLES.SuperAdmin) { router.replace('/admin/vendors'); return; }

    // Vendor — full access
    if (role === ROLES.Vendor) return;

    // Employee — wait until designation is loaded, then check
    if (role === ROLES.Employee) {
      if (designation === undefined) return; // still loading
      if (!designation || !canAccess(designation, slug)) {
        router.replace('/vendor/dashboard');
      }
    }
  }, [user, isInitialized, designation, slug, router]);
}
