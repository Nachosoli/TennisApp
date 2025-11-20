import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/lib/auth';
// Socket connection handled by SocketProvider in layout

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          console.log('AuthStore: Calling authApi.login...');
          const response = await authApi.login({ email, password });
          console.log('AuthStore: Login API response received:', response);
          
          // Validate response has required fields
          if (!response.accessToken || !response.refreshToken || !response.user) {
            console.error('AuthStore: Invalid login response:', response);
            throw new Error('Invalid login response: missing required fields');
          }
          
          // Normalize user data to match frontend interface
          const normalizedUser = {
            ...response.user,
            verified: response.user.phoneVerified !== undefined ? response.user.phoneVerified : false, // Backend uses phoneVerified, frontend uses verified
            phoneVerified: response.user.phoneVerified !== undefined ? response.user.phoneVerified : false,
            role: (response.user.role?.toUpperCase() || 'USER') as 'USER' | 'ADMIN',
          };
          console.log('AuthStore: Normalized user:', normalizedUser);
          
          // Set state first
          set({
            user: normalizedUser as User,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Then save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            console.log('AuthStore: Tokens saved to localStorage');
            
            // Verify tokens were saved
            const savedAccessToken = localStorage.getItem('accessToken');
            const savedRefreshToken = localStorage.getItem('refreshToken');
            if (savedAccessToken !== response.accessToken || savedRefreshToken !== response.refreshToken) {
              console.warn('AuthStore: Token save verification failed');
            }
            // Socket connection handled by SocketProvider
          }
          
          console.log('AuthStore: Login completed successfully');
        } catch (error: any) {
          set({ isLoading: false });
          console.error('AuthStore: Login error:', error);
          console.error('AuthStore: Error response:', error?.response || error?.originalError?.response);
          console.error('AuthStore: Error status:', error?.statusCode || error?.originalError?.response?.status);
          console.error('AuthStore: Error message:', error?.message);
          
          // Re-throw with enhanced error if available
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: (skipRedirect = false) => {
        authApi.logout();
        // Socket disconnection handled by SocketProvider
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Redirect to landing page unless skipRedirect is true
          if (!skipRedirect) {
            window.location.href = '/';
          }
        }
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      checkAuth: async () => {
        const state = get();
        // Prevent multiple simultaneous calls
        if (state.isLoading) {
          return;
        }

        set({ isLoading: true });
        
        const { accessToken } = state;
        if (!accessToken) {
          // Check localStorage as fallback (zustand persist might not have synced)
          if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('accessToken');
            const storedRefreshToken = localStorage.getItem('refreshToken');
            if (storedToken && storedRefreshToken) {
              // Sync from localStorage
              set({
                accessToken: storedToken,
                refreshToken: storedRefreshToken,
              });
              // Try to get user
              try {
                const user = await authApi.getCurrentUser();
                set({ user, isAuthenticated: true, isLoading: false });
                return;
              } catch (error) {
                // If getCurrentUser fails, don't clear tokens - might be temporary
                console.warn('Failed to get current user, but keeping tokens:', error);
                set({ isLoading: false });
                return;
              }
            }
          }
          set({ isAuthenticated: false, user: null, isLoading: false });
          return;
        }

        try {
          const user = await authApi.getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          // Only clear auth state if it's a permanent auth failure (401), not network errors
          if (error?.response?.status === 401) {
            // Token is invalid, clear everything
            set({ isAuthenticated: false, user: null, accessToken: null, refreshToken: null, isLoading: false });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            }
          } else {
            // Network error or other temporary issue - keep auth state
            console.warn('Failed to check auth, but keeping current state:', error);
            set({ isLoading: false });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Listen for logout events from API interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}

