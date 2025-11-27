import { create } from 'zustand';
import { Notification, NotificationPreference } from '@/types';
import { notificationsApi } from '@/lib/notifications';

interface NotificationsState {
  notifications: Notification[];
  preferences: NotificationPreference[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreference: (data: {
    notificationType: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
  }) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  preferences: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    const state = get();
    // Prevent multiple simultaneous calls
    if (state.isLoading) {
      return;
    }

    set({ isLoading: true });
    try {
      const notifications = await notificationsApi.getMyNotifications();
      const unreadCount = notifications.filter((n) => n.status?.toLowerCase() === 'pending').length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      // Don't throw - just log the error to prevent infinite loops
      console.error('Failed to fetch notifications:', error);
    }
  },

  fetchPreferences: async () => {
    try {
      const preferences = await notificationsApi.getPreferences();
      set({ preferences });
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  },

  updatePreference: async (data) => {
    try {
      await notificationsApi.updatePreference(data);
      await get().fetchPreferences();
    } catch (error) {
      throw error;
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => {
      // Check if notification already exists to prevent duplicates
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) {
        return state; // Don't add duplicate
      }
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  markAsRead: (notificationId: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, status: 'sent' as const } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  deleteNotification: async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  },

  clearAll: async () => {
    try {
      await notificationsApi.clearAllNotifications();
      set({
        notifications: [],
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw error;
    }
  },
}));
