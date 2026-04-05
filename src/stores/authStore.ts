import { create } from 'zustand';

interface AuthState {
  user: { id: string; email: string } | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  login: async (email: string, _password: string) => {
    set({ isLoading: true });
    // Mock auth delay
    await new Promise((r) => setTimeout(r, 500));
    set({ user: { id: crypto.randomUUID(), email }, isLoading: false });
  },
  signup: async (email: string, _password: string) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 500));
    set({ user: { id: crypto.randomUUID(), email }, isLoading: false });
  },
  logout: () => set({ user: null }),
}));
