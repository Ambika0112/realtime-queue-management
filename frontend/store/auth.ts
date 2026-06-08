import { create } from 'zustand';
import { User } from '@/types/user';
import { apiFetch } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // We start isLoading as true so the app waits to check localStorage
  // before showing a "Please log in" screen.
  isLoading: true, 

  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user });
  },

  logout: () => {
    // Clear the JWT token
    localStorage.removeItem('token');
    
    // Wipe ALL localStorage so the next user doesn't inherit queue tokens!
    localStorage.clear(); 
    
    set({ user: null });
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token) {
      set({ user: null, isLoading: false });
      return;
    }

    try {
      // Hit our backend to verify the token and get the user data
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        const userData = await res.json();
        set({ user: userData, isLoading: false });
      } else {
        // Token is invalid/expired
        localStorage.removeItem('token');
        set({ user: null, isLoading: false });
      }
    } catch (error) {
      set({ user: null, isLoading: false });
    }
  },
}));
