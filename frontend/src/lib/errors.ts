/**
 * Error utility functions for better error handling and user-friendly messages
 */

export interface ErrorDetails {
  isNetworkError: boolean;
  isTimeoutError: boolean;
  isAuthError: boolean;
  statusCode?: number;
  message: string;
  originalError: any;
}

/**
 * Check if an error is a network-related error (connection issues, timeouts, etc.)
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  // Check for network errors
  if (error.code === 'ERR_NETWORK') return true;
  if (error.code === 'ECONNABORTED') return true;
  if (error.message?.includes('Network Error')) return true;
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('Failed to fetch')) return true;

  // Check if response is missing (network issue)
  if (!error.response && error.request) return true;

  return false;
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  if (!error) return false;
  if (error.code === 'ECONNABORTED') return true;
  if (error.message?.includes('timeout')) return true;
  return false;
}

/**
 * Check if an error is an authentication error (401, 403)
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

/**
 * Get detailed error information for debugging
 */
export function getErrorDetails(error: any): ErrorDetails {
  return {
    isNetworkError: isNetworkError(error),
    isTimeoutError: isTimeoutError(error),
    isAuthError: isAuthError(error),
    statusCode: error?.response?.status,
    message: error?.message || 'Unknown error',
    originalError: error,
  };
}

/**
 * Get user-friendly error message from an error object
 */
export function getErrorMessage(error: any): string {
  // Handle aborted requests
  if (error?.isAborted || error?.code === 'ERR_CANCELED' || error?.message?.includes('aborted') || error?.message?.includes('NS_BINDING_ABORTED')) {
    return 'Request was cancelled. Please check if the backend server is running and accessible.';
  }
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Network errors
  if (isNetworkError(error)) {
    if (isTimeoutError(error)) {
      return 'Request timed out. Please check your internet connection and try again.';
    }
    return 'Network error. Please check your internet connection and try again.';
  }

  // HTTP status code errors
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.message;
  
  if (status) {
    switch (status) {
      case 400:
        // Provide user-friendly messages for common validation errors
        if (backendMessage) {
          // Check for specific validation error patterns
          if (backendMessage.includes('email') && backendMessage.includes('invalid')) {
            return 'Please enter a valid email address.';
          }
          if (backendMessage.includes('password')) {
            return backendMessage.includes('weak') || backendMessage.includes('short')
              ? 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers.'
              : backendMessage;
          }
          if (backendMessage.includes('phone')) {
            return 'Please enter a valid phone number in the format +1XXXXXXXXXX.';
          }
          return backendMessage;
        }
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return backendMessage || 'Invalid email or password. Please check your credentials and try again.';
      case 403:
        // Provide more specific messages for common 403 errors
        if (backendMessage) {
          const lowerMessage = backendMessage.toLowerCase();
          if (lowerMessage.includes('home court') || lowerMessage.includes('homecourt')) {
            return 'You need to set a home court before creating matches. Please add a home court to your profile first.';
          }
          if (lowerMessage.includes('phone') && lowerMessage.includes('verify')) {
            return 'Please verify your phone number before creating matches. You can verify it in your profile settings.';
          }
          return backendMessage;
        }
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return backendMessage || 'The requested resource was not found.';
      case 409:
        // Conflict errors - provide user-friendly messages
        if (backendMessage) {
          if (backendMessage.toLowerCase().includes('email') && backendMessage.toLowerCase().includes('already exists')) {
            return 'An account with this email address already exists. Please sign in or use a different email.';
          }
          if (backendMessage.toLowerCase().includes('phone') && backendMessage.toLowerCase().includes('already exists')) {
            return 'An account with this phone number already exists. Please sign in or use a different phone number.';
          }
          if (backendMessage.toLowerCase().includes('already exists')) {
            return backendMessage;
          }
          return backendMessage;
        }
        return 'This resource already exists. Please try again with different information.';
      case 422:
        // Unprocessable Entity - validation errors
        return backendMessage || 'The information you provided is invalid. Please check your input and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'A server error occurred. Please try again later. If the problem persists, contact support.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again in a moment.';
      default:
        return backendMessage || `An error occurred (${status}). Please try again.`;
    }
  }

  // Backend error message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Generic error message
  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error details for debugging (development only)
 */
export function logError(context: string, error: any): void {
  if (process.env.NODE_ENV === 'development') {
    const details = getErrorDetails(error);
    console.group(`[${context}] Error Details`);
    console.error('Error:', error);
    console.error('Is Network Error:', details.isNetworkError);
    console.error('Is Timeout Error:', details.isTimeoutError);
    console.error('Is Auth Error:', details.isAuthError);
    console.error('Status Code:', details.statusCode);
    console.error('Message:', details.message);
    console.error('Response:', error?.response);
    console.error('Request:', error?.request);
    console.groupEnd();
  }
}

