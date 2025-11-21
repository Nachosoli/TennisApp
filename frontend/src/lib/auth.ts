import { apiClient } from './api';
import { LoginCredentials, RegisterData, AuthResponse, User } from '@/types';
import { courtsApi } from './courts';
import { getErrorMessage, logError, isNetworkError } from './errors';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('authApi.login: Calling API with credentials:', { email: credentials.email });
    
    // Clear any stale tokens before login to prevent interference
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      console.log('authApi.login: API response received:', response);
      console.log('authApi.login: Response data:', response.data);
      return response.data;
    } catch (error: any) {
      logError('authApi.login', error);
      console.error('authApi.login: API call failed:', error);
      console.error('authApi.login: Error response:', error?.response);
      console.error('authApi.login: Error status:', error?.response?.status);
      console.error('authApi.login: Error message:', error?.message);
      
      // Enhance error with user-friendly message
      const enhancedError = new Error(getErrorMessage(error));
      (enhancedError as any).originalError = error;
      (enhancedError as any).isNetworkError = isNetworkError(error);
      (enhancedError as any).statusCode = error?.response?.status;
      
      throw enhancedError;
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    // Clear any stale tokens before register
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      return response.data;
    } catch (error: any) {
      logError('authApi.register', error);
      const enhancedError = new Error(getErrorMessage(error));
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  async sendPhoneVerificationCode(phone: string): Promise<void> {
    await apiClient.post('/auth/send-phone-verification', { phone });
  },

  async verifyPhone(phone: string, code: string): Promise<void> {
    await apiClient.post('/auth/verify-phone', { phone, code });
  },

  async verifyEmail(email: string, token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { email, token });
  },

  async resendVerificationEmail(): Promise<void> {
    await apiClient.post('/auth/resend-verification-email');
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { email, token, newPassword });
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    bio?: string;
    homeCourtId?: string;
    ratingType?: 'utr' | 'usta' | 'ultimate' | 'custom';
    ratingValue?: number;
  }): Promise<User> {
    const response = await apiClient.put<User>('/users/me', data, { timeout: 30000 });
    return response.data;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },
};

// Re-export courtsApi for convenience
export { courtsApi };

