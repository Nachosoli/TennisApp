'use client';

import { useEffect, useState, useRef } from 'react';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card } from '../ui/Card';
import { format } from 'date-fns';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, fetchNotifications } = useNotificationsStore();
  const { user, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const hasLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Prevent multiple loads for the same user
    if (hasLoadedRef.current === user.id) {
      return;
    }

    hasLoadedRef.current = user.id;
    fetchNotifications();
  }, [user?.id, fetchNotifications]);

  const unreadNotifications = notifications.filter((n) => n.status?.toLowerCase() === 'pending');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto z-20">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    unreadNotifications.forEach((n) => markAsRead(n.id));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-200">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      notification.status?.toLowerCase() === 'pending' ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (notification.status?.toLowerCase() === 'pending') {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(notification.createdAt), 'MMM dd, h:mm a')}
                        </p>
                      </div>
                      {notification.status?.toLowerCase() === 'pending' && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full mt-1" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

