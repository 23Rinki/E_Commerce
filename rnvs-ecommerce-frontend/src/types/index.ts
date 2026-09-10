export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: number; // 1=Customer, 2=Vendor, 3=Employee, 4=Admin, 5=SuperAdmin
  isVendor: boolean;
  storeName?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
}

export interface ProductImage {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
  altText?: string;
}

export interface ProductVariant {
  id: number;
  name: string;
  value: string;
  price?: number;
  stock?: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  categoryId: number;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
  averageRating?: number;
  reviewCount?: number;
  stock?: number;
  vendorId?: string;
  status?: string;
}

// Matches CartItemDto from backend
export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  imageUrl?: string;
  vendorId?: string;
}

// Matches CartDto from backend
export interface Cart {
  id: number;
  userId: string;
  items: CartItem[];
  subTotal: number;
  totalItems: number;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Status: 1=Pending, 2=Processing, 3=Shipped, 4=Delivered, 5=Cancelled, 6=Refunded, 7=Returned
export interface Order {
  id: number;
  orderNumber: string;
  userId: string;
  vendorId?: string;
  customerEmail?: string;
  customerPhone?: string;
  subTotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  status: number;
  createdAt: string;
  items: OrderItem[];
}

export const ORDER_STATUS: Record<number, string> = {
  1: 'Pending',
  2: 'Processing',
  3: 'Shipped',
  4: 'Delivered',
  5: 'Cancelled',
  6: 'Refunded',
  7: 'Returned',
};

export interface AddressDto {
  id: number;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  type: number; // 0=Shipping, 1=Billing
}

export interface PaymentMethod {
  id: number;
  userId: string;
  type: string;
  lastFourDigits?: string;
  brandName?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Review {
  id: number;
  userId: string;
  userName: string;
  productId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
