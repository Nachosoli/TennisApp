'use client';

import { useEffect, useState } from 'react';
import { socketService } from '@/lib/socket';
import { Notification } from '@/types';
import { apiClient } from '@/lib/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load initial notifications
    loadNotifications();

    // Subscribe to real-time notifications
    const socket = socketService.getSocket();
    if (socket) {
      const handleNotification = (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      };

      socketService.onNotification(handleNotification);

      return () => {
        socketService.offNotification(handleNotification);
      };
    }
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.get<Notification[]>('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n) => n.status === 'PENDING').length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, status: 'SENT' as const } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    refresh: loadNotifications,
  };
};
