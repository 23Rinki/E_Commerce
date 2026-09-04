import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7147';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const url = err.config?.url ?? '';
      // Don't redirect for silent auth verification, or for a failed login/register
      // attempt itself — let the page show its own inline error instead.
      if (url.includes('/api/auth/me') || url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
        return Promise.reject(err);
      }
      // Only redirect if there is genuinely no token left (i.e. session expired).
      // If a token exists in localStorage, the 401 may be a transient race on page
      // load — don't hard-redirect and wipe a valid session.
      const tokenStillPresent = !!localStorage.getItem('token');
      if (!tokenStillPresent) {
        localStorage.removeItem('user');
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/login?returnUrl=${returnUrl}`;
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Helper to unwrap { success, data } responses from the backend
export function unwrap<T>(responseData: any): T {
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data as T;
  }
  return responseData as T;
}

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneNumber?: string;
    role?: number;
    storeName?: string;
    udyamCertificateNumber?: string;
    companyPanNumber?: string;
    gstNumber?: string;
  }) => api.post('/api/auth/register', data),
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (data: { email: string; token: string; newPassword: string }) =>
    api.post('/api/auth/reset-password', data),
};

export const productsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/api/products', { params }),
  getById: (id: number | string) => api.get(`/api/products/${id}`),
  search: (query: string, params?: Record<string, unknown>) =>
    api.get('/api/search/products', { params: { query, ...params } }),
  getFeatured: () =>
    api.get('/api/products', { params: { pageSize: 30, pageNumber: 1 } }),
  trackView: (productId: number | string, sessionId: string, referrer?: string) =>
    api.post(`/api/products/${productId}/track-view`, { sessionId, referrer }).catch(() => {}),
};

export const platformAdminApi = {
  getStats: () => api.get('/api/platform/stats'),
  getTenants: (params?: { status?: string; plan?: string; search?: string }) =>
    api.get('/api/platform/tenants', { params }),
  getTenant: (id: number) => api.get(`/api/platform/tenants/${id}`),
  createTenant: (data: { vendorId: string; storeName: string; contactEmail: string; contactPhone?: string; plan: string }) =>
    api.post('/api/platform/tenants', data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/api/platform/tenants/${id}/status`, { status }),
  addNote: (id: number, note: string) =>
    api.put(`/api/platform/tenants/${id}/notes`, { note }),
  updateRailway: (id: number, data: { databaseUrl: string; serviceId?: string }) =>
    api.put(`/api/platform/tenants/${id}/database`, data),
  getOverview: (id: number) => api.get(`/api/platform/tenants/${id}/overview`),
  getOrders: (id: number, page = 1, pageSize = 20) =>
    api.get(`/api/platform/tenants/${id}/orders`, { params: { page, pageSize } }),
  getProducts: (id: number, page = 1, pageSize = 20) =>
    api.get(`/api/platform/tenants/${id}/products`, { params: { page, pageSize } }),
  deleteTenant: (id: number) => api.delete(`/api/platform/tenants/${id}`),
  getRemovedVendors: () => api.get('/api/platform/removed-vendors'),
  getSalesSummary: () => api.get('/api/platform/sales-summary'),
};

export const vendorProductsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/api/products/vendor/mine', { params }),
  getById: (id: number, vendorId?: string) =>
    api.get(`/api/products/${id}`, vendorId ? { params: { v: vendorId } } : undefined),
  create: (data: { name: string; shortDescription?: string; description: string; price: number; discountPrice?: number; stockQuantity: number; categoryId: number }) =>
    api.post('/api/products', data),
  update: (id: number, data: { name: string; shortDescription?: string; description: string; price: number; discountPrice?: number; stockQuantity: number; categoryId: number; isActive: boolean }) =>
    api.put(`/api/products/${id}`, data),
  delete: (id: number, vendorId?: string) =>
    api.delete(`/api/products/${id}`, vendorId ? { params: { v: vendorId } } : undefined),
  uploadImage: (productId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/api/products/${productId}/images`, formData, {
      headers: { 'Content-Type': undefined },
    });
  },
  deleteImage: (productId: number, imageId: number, vendorId?: string) =>
    api.delete(`/api/products/${productId}/images/${imageId}`, vendorId ? { params: { v: vendorId } } : undefined),
  getRemovedImages: () => api.get('/api/products/removed-images'),
  restoreImage: (recordId: number) => api.post(`/api/products/removed-images/${recordId}/restore`),
  activate: (id: number, vendorId?: string) =>
    api.put(`/api/products/${id}/activate`, {}, vendorId ? { params: { v: vendorId } } : undefined),
};

export const categoriesApi = {
  getAll: () => api.get('/api/categories'),
  getStorefront: () => api.get('/api/categories/storefront'),
  getMine: () => api.get('/api/categories/mine'),
  create: (name: string) => api.post('/api/categories', { name, description: name }),
};

export const bannedWordsApi = {
  getAll: () => api.get('/api/bannedwords'),
  add: (word: string) => api.post('/api/bannedwords', { word }),
  delete: (id: number) => api.delete(`/api/bannedwords/${id}`),
};

export const cartApi = {
  get: () => api.get('/api/cart'),
  add: (data: { productId: number; quantity: number; variantId?: number; vendorId?: string }) =>
    api.post('/api/cart/items', data),
  update: (itemId: number, quantity: number) =>
    api.put(`/api/cart/items/${itemId}`, { quantity }),
  remove: (itemId: number) => api.delete(`/api/cart/items/${itemId}`),
  clear: () => api.delete('/api/cart'),
};

export const ordersApi = {
  getAll: () => api.get('/api/orders'),
  getById: (id: number | string, vendorId?: string) =>
    api.get(`/api/orders/${id}`, vendorId ? { params: { v: vendorId } } : undefined),
  create: (data: { shippingAddressId: number; paymentMethodId: number }) =>
    api.post('/api/orders', data),
  cancel: (id: number, vendorId?: string) =>
    api.post(`/api/orders/${id}/cancel`, {}, vendorId ? { params: { v: vendorId } } : undefined),
  getTracking: (id: number, vendorId?: string) =>
    api.get(`/api/orders/${id}/tracking`, vendorId ? { params: { v: vendorId } } : undefined),
};

export const vendorOrdersApi = {
  getAll: () => api.get('/api/orders/vendor-orders'),
  updateStatus: (id: number, status: number, comment?: string, vendorId?: string) =>
    api.put(`/api/orders/${id}/status`, { status, comment }, vendorId ? { params: { v: vendorId } } : undefined),
};

export const wishlistApi = {
  get: () => api.get('/api/wishlist'),
  add: (productId: number) => api.post('/api/wishlist', { productId }),
  remove: (wishlistItemId: number) => api.delete(`/api/wishlist/${wishlistItemId}`),
};

export const reviewsApi = {
  getByProduct: (productId: number | string) =>
    api.get(`/api/reviews/product/${productId}`),
  create: (data: Record<string, unknown>) => api.post('/api/reviews', data),
};

export const addressesApi = {
  getAll: () => api.get('/api/addresses'),
  create: (data: Record<string, unknown>) => api.post('/api/addresses', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/api/addresses/${id}`, data),
  remove: (id: number) => api.delete(`/api/addresses/${id}`),
  setDefault: (id: number) => api.post(`/api/addresses/${id}/set-default`),
};

export const paymentMethodsApi = {
  getAll: () => api.get('/api/payments/methods'),
  create: (data: { type: string; lastFourDigits?: string; brandName?: string; isDefault?: boolean }) =>
    api.post('/api/payments/methods', data),
  remove: (id: number) => api.delete(`/api/payments/methods/${id}`),
};

export const usersApi = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (data: { firstName?: string; lastName?: string; phoneNumber?: string; gstNumber?: string | null }) =>
    api.put('/api/users/profile', data),
};

export const vendorProfileApi = {
  get: () => api.get('/api/users/vendor-profile'),
  update: (data: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    storeName?: string;
    udyamCertificateNumber?: string;
    companyPanNumber?: string;
    gstNumber?: string;
  }) => api.put('/api/users/vendor-profile', data),
};

export const employeeApi = {
  getAll: () => api.get('/api/employee'),
  getMe: () => api.get('/api/employee/me'),
  create: (data: {
    firstName: string; lastName: string; email: string; password: string;
    designation: string; phoneNumber: string;
    address?: string; city?: string; state?: string; postalCode?: string; country?: string;
    notes?: string;
  }) => api.post('/api/employee', data),
  update: (id: number, data: {
    designation?: string; phoneNumber?: string; isActive?: boolean;
    address?: string; city?: string; state?: string; postalCode?: string; country?: string;
    notes?: string;
  }) => api.put(`/api/employee/${id}`, data),
  remove: (id: number) => api.delete(`/api/employee/${id}`),
};

export const vendorSettingsApi = {
  getAll: () => api.get('/api/platformsettings/vendor/mine'),
  initialize: () => api.post('/api/platformsettings/vendor/initialize'),
  update: (key: string, value: string) =>
    api.put(`/api/platformsettings/vendor/${key}`, { value }),
};

export const brandingApi = {
  get: () => api.get('/api/brandingsettings'),
  update: (data: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoUrl?: string | null;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeEmail?: string;
    website?: string;
    gstNumber?: string;
    billFieldsJson?: string;
    customerFieldsJson?: string;
    templateStyle?: string;
    showQrCode?: boolean;
    qrValue?: string;
    useUpiQr?: boolean;
    upiId?: string;
    showBarcode?: boolean;
    footerNote?: string;
    signatureText?: string;
    signatureImageUrl?: string;
    cgstPercent?: number;
    sgstPercent?: number;
    igstPercent?: number;
  }) => api.put('/api/brandingsettings', data),
  uploadLogo: (formData: FormData) =>
    api.post('/api/brandingsettings/logo', formData, {
      headers: { 'Content-Type': undefined },
    }),
  uploadSignature: (formData: FormData) =>
    api.post('/api/brandingsettings/signature', formData, {
      headers: { 'Content-Type': undefined },
    }),
  uploadReceiptTemplate: (formData: FormData) =>
    api.post('/api/brandingsettings/receipt-template', formData, {
      headers: { 'Content-Type': undefined },
    }),
  removeReceiptTemplate: () =>
    api.delete('/api/brandingsettings/receipt-template'),
  downloadReceiptPdf: (orderId: number) =>
    api.get(`/api/brandingsettings/receipt-pdf/${orderId}`, { responseType: 'blob' }),
};

export const invoiceTemplatesApi = {
  getAll:     () => api.get('/api/invoicetemplates'),
  getById:    (id: number) => api.get(`/api/invoicetemplates/${id}`),
  create:     (data: object) => api.post('/api/invoicetemplates', data),
  update:     (id: number, data: object) => api.put(`/api/invoicetemplates/${id}`, data),
  delete:     (id: number) => api.delete(`/api/invoicetemplates/${id}`),
  setDefault: (id: number) => api.post(`/api/invoicetemplates/${id}/set-default`, {}),
};

export const inventoryApi = {
  getAll: () => api.get('/api/stocks'),
  getLowStock: () => api.get('/api/stocks/low-stock'),
  getByProduct: (productId: number) => api.get(`/api/stocks/product/${productId}`),
  create: (data: { productId: number; currentQuantity: number; reservedQuantity: number; minimumThreshold: number }) =>
    api.post('/api/stocks', data),
  update: (id: number, data: { currentQuantity: number; reservedQuantity: number; minimumThreshold: number }) =>
    api.put(`/api/stocks/${id}`, data),
};
