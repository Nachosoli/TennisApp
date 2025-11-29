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
      // Initialize notifications with read: false if not already set (preserve existing read state)
      const notificationsWithRead = notifications.map((n) => ({
        ...n,
        read: n.read !== undefined ? n.read : false,
      }));
      // Calculate unreadCount based on read flag instead of status
      const unreadCount = notificationsWithRead.filter((n) => !n.read).length;
      set({ notifications: notificationsWithRead, unreadCount, isLoading: false });
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
      // Ensure new notifications are marked as unread
      const newNotification = {
        ...notification,
        read: false,
      };
      // Only increment unreadCount if the notification is unread
      const isUnread = !newNotification.read;
      return {
        notifications: [newNotification, ...state.notifications],
        unreadCount: isUnread ? state.unreadCount + 1 : state.unreadCount,
      };
    });
  },

  markAsRead: (notificationId: string) => {
    set((state) => {
      let wasUnread = false;
      const updatedNotifications = state.notifications.map((n) => {
        if (n.id === notificationId) {
          wasUnread = !n.read; // Track if this notification was unread
          return { ...n, read: true };
        }
        return n;
      });
      // Only decrement unreadCount if the notification was actually unread
      const newUnreadCount = wasUnread
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount;
      return {
        notifications: updatedNotifications,
        unreadCount: newUnreadCount,
      };
    });
  },

  deleteNotification: async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      set((state) => {
        // Find the notification being deleted to check if it was unread
        const deletedNotification = state.notifications.find((n) => n.id === notificationId);
        const wasUnread = deletedNotification ? !deletedNotification.read : false;
        return {
          notifications: state.notifications.filter((n) => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
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
