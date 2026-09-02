import { create } from 'zustand';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from '@/config/firebase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      set({ user: result.user, isAuthenticated: true });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, isAuthenticated: false });
  },

  initAuth: () => {
    onAuthStateChanged(auth, (user) => {
      set({ user, isAuthenticated: !!user, isLoading: false });
    });
  },
}));
