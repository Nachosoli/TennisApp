import { apiClient } from './api';
import { getErrorMessage, logError } from './errors';

export interface ContactFormData {
  subject: 'support' | 'bug' | 'feedback' | 'feature' | 'other';
  message: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

export const contactApi = {
  async submitContactForm(data: ContactFormData): Promise<ContactResponse> {
    try {
      const response = await apiClient.post<ContactResponse>('/contact', data);
      return response.data;
    } catch (error: any) {
      logError('contactApi.submitContactForm', error);
      const enhancedError = new Error(getErrorMessage(error));
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }
  },
};

