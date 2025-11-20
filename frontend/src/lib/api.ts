import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { isNetworkError, logError } from './errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Log API URL in development to help debug connection issues
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[API Config] API Base URL:', API_BASE_URL);
}

// Endpoints that should not have Authorization header
const NO_AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      timeout: 30000, // 30 second timeout (increased from 10s for complex operations)
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Don't add auth token to login/register/refresh endpoints
        const isAuthEndpoint = NO_AUTH_ENDPOINTS.some(endpoint => 
          config.url?.includes(endpoint)
        );

        if (!isAuthEndpoint && typeof window !== 'undefined') {
          const token = localStorage.getItem('accessToken');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
            baseURL: config.baseURL,
            timeout: config.timeout,
            hasAuth: !isAuthEndpoint && !!localStorage.getItem('accessToken'),
          });
        }

        return config;
      },
      (error) => {
        logError('Request Interceptor', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => {
        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            statusText: response.statusText,
          });
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Log error in development
        if (process.env.NODE_ENV === 'development') {
          logError('Response Interceptor', error);
        }

        // Handle aborted requests
        if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted') || error.message?.includes('NS_BINDING_ABORTED')) {
          const abortedError = new Error(
            'Request was cancelled. This may be due to network connectivity issues or the server not responding. Please check if the backend server is running and accessible.'
          );
          (abortedError as any).isAborted = true;
          return Promise.reject(abortedError);
        }

        // Handle timeout errors with better messaging
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          const timeoutError = new Error(
            error.config?.url?.includes('/matches') && error.config?.method === 'post'
              ? 'Match creation is taking longer than expected. Please wait...'
              : 'Request timed out. Please try again or check your connection.'
          );
          (timeoutError as any).isTimeout = true;
          return Promise.reject(timeoutError);
        }

        // Handle network errors
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
          const networkError = new Error(
            `Cannot connect to the server at ${error.config?.baseURL || 'the backend'}. Please ensure the backend server is running and accessible.`
          );
          (networkError as any).isNetworkError = true;
          return Promise.reject(networkError);
        }

        // Don't try to refresh token for auth endpoints
        const isAuthEndpoint = NO_AUTH_ENDPOINTS.some(endpoint => 
          originalRequest?.url?.includes(endpoint)
        );

        if (isAuthEndpoint) {
          return Promise.reject(error);
        }

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(
                `${API_BASE_URL}/auth/refresh`,
                { refreshToken },
                { timeout: 5000 }, // 5 second timeout for refresh
              );
              const { accessToken } = response.data;
              localStorage.setItem('accessToken', accessToken);
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return this.client(originalRequest);
            }
          } catch (refreshError: any) {
            // Refresh failed - only clear auth if token is truly invalid (401), not network errors
            if (refreshError?.response?.status === 401 && typeof window !== 'undefined') {
              // Token is invalid, clear storage
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              // Dispatch custom event for auth store to listen to
              window.dispatchEvent(new CustomEvent('auth:logout'));
              window.location.href = '/auth/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  get instance() {
    return this.client;
  }
}

export const apiClient = new ApiClient().instance;

