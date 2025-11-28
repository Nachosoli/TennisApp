'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { Notification } from '@/types';
import { format } from 'date-fns';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const socket = useSocket();
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    addNotification,
    markAsRead,
    clearAll,
  } = useNotificationsStore();
  const hasLoadedRef = useRef<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Prevent multiple loads for the same user
    if (hasLoadedRef.current === user.id) {
      return;
    }

    hasLoadedRef.current = user.id;
    fetchNotifications();

    // Listen for new notifications via socket
    const handleNotification = (notification: Notification) => {
      addNotification(notification);
    };

    socket.onNotification(handleNotification);

    return () => {
      socket.offNotification(handleNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user ID, not the entire user object or functions

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
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
          <span className="absolute top-0.5 right-0.5 block h-3 w-3 rounded-full bg-red-600 ring-2 ring-white z-10" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10 sm:bg-transparent"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-1/2 sm:right-0 translate-x-1/2 sm:translate-x-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 z-20 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer min-h-[60px] flex flex-col justify-center"
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    <p className="text-sm text-gray-900">{notification.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(notification.createdAt), 'MMM dd, h:mm a')}
                    </p>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors min-h-[44px] flex items-center justify-center"
                >
                  View All
                </Link>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to clear all notifications?')) {
                      setIsClearing(true);
                      try {
                        await clearAll();
                        setIsOpen(false);
                      } catch (error) {
                        console.error('Failed to clear notifications:', error);
                        alert('Failed to clear notifications. Please try again.');
                      } finally {
                        setIsClearing(false);
                      }
                    }
                  }}
                  disabled={isClearing}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                >
                  {isClearing ? 'Clearing...' : 'Clear'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
