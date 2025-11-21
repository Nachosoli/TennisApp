'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

export default function NotificationsPage() {
  const { isLoading: authLoading, user } = useRequireAuth();
  const { notifications, markAsRead } = useNotifications();

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>

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
                <Link
                  href={getNotificationLink(notification)}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start">
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
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

