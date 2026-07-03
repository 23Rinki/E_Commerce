// Maps each designation to the nav slugs they can access
export const DESIGNATION_ACCESS: Record<string, string[]> = {
  'Manager':         ['dashboard', 'products', 'orders', 'inventory', 'employees', 'receipts', 'invoices', 'reports', 'shipping', 'settings'],
  'Sales Staff':     ['dashboard', 'products', 'orders'],
  'Support':         ['dashboard', 'orders'],
  'Cashier':         ['dashboard', 'orders', 'receipts'],
  'Warehouse Staff': ['dashboard', 'inventory'],
  'Delivery Staff':  ['dashboard', 'orders'],
};

// Role numbers from the backend UserRole enum
export const ROLES = {
  Customer:   1,
  Vendor:     2,
  Employee:   3,
  Admin:      4,
  SuperAdmin: 5,
} as const;

export function getAllowedSlugs(designation: string): string[] {
  return DESIGNATION_ACCESS[designation] ?? ['dashboard'];
}

export function canAccess(designation: string, slug: string): boolean {
  return getAllowedSlugs(designation).includes(slug);
}
