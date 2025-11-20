import { apiClient } from './api';
import { Notification, NotificationPreference } from '@/types';

export const notificationsApi = {
  async getMyNotifications(): Promise<Notification[]> {
    const response = await apiClient.get<Notification[]>('/notifications');
    return response.data;
  },

  async getPreferences(): Promise<NotificationPreference[]> {
    const response = await apiClient.get<NotificationPreference[]>('/notifications/preferences');
    return response.data;
  },

  async updatePreference(data: {
    notificationType: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
  }): Promise<NotificationPreference> {
    const response = await apiClient.put<NotificationPreference>('/notifications/preferences', data);
    return response.data;
  },
};

