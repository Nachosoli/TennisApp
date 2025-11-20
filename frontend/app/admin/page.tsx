'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { adminApi } from '@/lib/admin';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/PageLoader';
import { useRouter } from 'next/navigation';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';

export default function AdminDashboard() {
  const router = useRouter();
  const { isLoading: authLoading, user, isAdmin } = useRequireAdmin();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    // Prevent multiple loads for the same user
    if (hasLoadedRef.current === user.id) {
      return;
    }

    // Mark as loaded for this user
    hasLoadedRef.current = user.id;
    setIsLoading(true);
    setError(null);

    adminApi.getAnalytics()
      .then((data) => {
        setAnalytics(data);
        setError(null);
      })
      .catch((err) => {
        // Only log error once per user session
        console.error('Failed to load analytics:', err);
        setError('Failed to load dashboard analytics. Please refresh the page.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user?.id, isAdmin]); // Only depend on user ID and admin status

  if (authLoading) {
    return (
      <Layout>
        <PageLoader text="Loading dashboard..." />
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return null; // Redirect handled by useRequireAdmin
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{analytics.totalUsers}</p>
                <p className="text-sm text-gray-600 mt-1">Total Users</p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{analytics.activeUsers}</p>
                <p className="text-sm text-gray-600 mt-1">Active Users</p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{analytics.totalMatches}</p>
                <p className="text-sm text-gray-600 mt-1">Total Matches</p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{analytics.totalCourts}</p>
                <p className="text-sm text-gray-600 mt-1">Total Courts</p>
              </div>
            </Card>
          </div>
        )}

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="User Management">
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/admin/users')}
              >
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/admin/reports')}
              >
                View Reports
              </Button>
            </div>
          </Card>

          <Card title="Content Management">
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/admin/courts')}
              >
                Manage Courts
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/admin/matches')}
              >
                Manage Matches
              </Button>
            </div>
          </Card>
        </div>

        {/* Match Statistics */}
        {analytics && (
          <Card title="Match Statistics">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Confirmed Matches</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.confirmedMatches}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Matches</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.completedMatches}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.matchCompletionRate?.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
