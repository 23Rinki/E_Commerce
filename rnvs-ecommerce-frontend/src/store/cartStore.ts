import { create } from 'zustand';
import { Cart } from '@/types';

interface CartState {
  cart: Cart | null;
  itemCount: number;
  setCart: (cart: Cart | null) => void;
  clearCart: () => void;
  incrementCount: (by?: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  itemCount: 0,

  setCart: (cart) =>
    set({
      cart,
      itemCount: cart?.totalItems ?? cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0,
    }),

  clearCart: () => set({ cart: null, itemCount: 0 }),

  incrementCount: (by = 1) =>
    set((s) => ({ itemCount: Math.max(0, s.itemCount + by) })),
}));
