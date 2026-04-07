import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  initAuth: () => Promise<() => void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    const u = data.user;
    set({
      user: u ? { id: u.id, email: u.email ?? '' } : null,
      isLoading: false,
    });
  },

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return { needsConfirmation: false };
    }
    const u = data.user;
    // If identities is empty, email confirmation is required
    const needsConfirmation = !u || (u.identities?.length === 0);
    if (!needsConfirmation && u) {
      set({ user: { id: u.id, email: u.email ?? '' }, isLoading: false });
    } else {
      set({ isLoading: false });
    }
    return { needsConfirmation };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  initAuth: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({
        user: { id: session.user.id, email: session.user.email ?? '' },
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }

    // Subscribe to auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      set({ user: u ? { id: u.id, email: u.email ?? '' } : null });
    });

    // Return unsubscribe function for cleanup
    return () => subscription.unsubscribe();
  },
}));
