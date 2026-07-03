import { create } from 'zustand';

interface VendorState {
  designation: string | null;   // null = not an employee / not loaded yet
  setDesignation: (d: string | null) => void;
}

export const useVendorStore = create<VendorState>((set) => ({
  designation: null,
  setDesignation: (designation) => set({ designation }),
}));
