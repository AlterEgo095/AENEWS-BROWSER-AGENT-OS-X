import { create } from 'zustand';

const API_BASE = '/api/v1';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: User | null;
  isRefreshing: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<string | null>;
  hydrate: () => Promise<void>;
  setToken: (token: string) => void;
}

/**
 * Auth store using in-memory token storage (Zustand state only).
 *
 * Security model:
 *   - Access token: stored in memory only (NOT persisted to localStorage)
 *   - Refresh token: stored in httpOnly cookie (set by backend, not accessible to JS)
 *
 * On page reload, the access token is lost (by design). The hydrate() method
 * calls /auth/refresh (which sends the httpOnly cookie automatically) to obtain
 * a new access token, restoring the session seamlessly.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isAuthenticated: false,
  user: null,
  isRefreshing: false,

  /**
   * Store access token in memory after successful login/register.
   * The refresh token is already set as an httpOnly cookie by the backend.
   */
  login: (token, user) => {
    set({ token, isAuthenticated: true, user });
  },

  /**
   * Set/update the access token (used after refresh).
   */
  setToken: (token) => {
    set({ token, isAuthenticated: true });
  },

  /**
   * Logout: call backend to clear the refresh cookie and revoke the token,
   * then clear in-memory state.
   */
  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Even if the API call fails, clear local state
    }
    set({ token: null, isAuthenticated: false, user: null });
  },

  /**
   * Refresh the access token using the httpOnly refresh cookie.
   * Called automatically on 401 responses and on page load (hydrate).
   *
   * @returns The new access token, or null if refresh failed
   */
  refreshAuth: async () => {
    // Prevent concurrent refresh requests
    if (get().isRefreshing) {
      // Wait for the in-flight refresh to complete
      return new Promise<string | null>((resolve) => {
        const interval = setInterval(() => {
          if (!get().isRefreshing) {
            clearInterval(interval);
            resolve(get().token);
          }
        }, 50);
      });
    }

    set({ isRefreshing: true });

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        // Refresh failed — clear auth state
        set({ token: null, isAuthenticated: false, user: null, isRefreshing: false });
        return null;
      }

      const json = await response.json();
      const data = json.data ?? json; // Handle TransformInterceptor wrapper

      if (data.accessToken) {
        set({
          token: data.accessToken,
          isAuthenticated: true,
          isRefreshing: false,
        });
        return data.accessToken;
      }

      // No access token in response — clear auth state
      set({ token: null, isAuthenticated: false, user: null, isRefreshing: false });
      return null;
    } catch {
      // Network error or other failure — clear auth state
      set({ token: null, isAuthenticated: false, user: null, isRefreshing: false });
      return null;
    }
  },

  /**
   * Hydrate auth state on page load.
   * Instead of reading from localStorage, calls /auth/refresh
   * (the httpOnly cookie is sent automatically by the browser).
   * If a valid refresh cookie exists, a new access token is issued.
   */
  hydrate: async () => {
    const token = await get().refreshAuth();
    if (!token) {
      // No valid session — user needs to log in again
      set({ token: null, isAuthenticated: false, user: null });
    }
  },
}));
