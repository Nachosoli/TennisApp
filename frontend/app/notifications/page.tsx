'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useState } from 'react';

export default function NotificationsPage() {
  const { isLoading: authLoading, user } = useRequireAuth();
  const { notifications, markAsRead } = useNotifications();
  const { deleteNotification, clearAll } = useNotificationsStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  if (authLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user) {
    return null; // Redirect handled by useRequireAuth
  }

  const getNotificationLink = (notification: any) => {
    const type = notification.type?.toLowerCase();
    switch (type) {
      case 'match_confirmed':
      case 'match_accepted':
      case 'match_created':
        return '/matches';
      case 'new_chat':
        return '/matches';
      default:
        return '/';
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }
    setDeletingId(notificationId);
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      alert('Failed to delete notification. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
      return;
    }
    setIsClearing(true);
    try {
      await clearAll();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      alert('Failed to clear notifications. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          {notifications.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={isClearing}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isClearing ? 'Clearing...' : 'Clear All'}
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-600">No notifications</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  notification.status?.toLowerCase() === 'pending' ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <Link
                    href={getNotificationLink(notification)}
                    onClick={() => markAsRead(notification.id)}
                    className="flex-1"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          notification.type?.toLowerCase() === 'match_confirmed' ? 'bg-green-100 text-green-800' :
                          notification.type?.toLowerCase() === 'match_accepted' ? 'bg-blue-100 text-blue-800' :
                          notification.type?.toLowerCase() === 'new_chat' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {notification.type?.replace('_', ' ') || notification.type}
                        </span>
                        {notification.status?.toLowerCase() === 'pending' && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-900">{notification.content}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {format(new Date(notification.createdAt), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDelete(notification.id);
                    }}
                    disabled={deletingId === notification.id}
                    className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete notification"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

