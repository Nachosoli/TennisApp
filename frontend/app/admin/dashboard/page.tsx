'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { analyticsApi, DashboardMetrics } from '@/lib/analytics';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/PageLoader';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isLoading: authLoading, user, isAdmin } = useRequireAdmin();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && isAdmin) {
      loadDashboardMetrics();
    }
  }, [user, isAdmin]);

  const loadDashboardMetrics = async () => {
    try {
      const data = await analyticsApi.getDashboard();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return null; // Redirect handled by useRequireAdmin
  }

  if (isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-lg text-gray-600 mt-2">Platform metrics and analytics</p>
        </div>

        {/* Key Metrics Cards */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white">
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.userGrowth.totalUsers}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {metrics.userGrowth.newUsersLast30Days} new in last 30 days
                  </p>
                </div>
              </Card>

              <Card className="bg-white">
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Active Users</p>
                  <p className="text-3xl font-bold text-green-600">{metrics.userGrowth.activeUsers}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {metrics.userGrowth.growthRate > 0 ? '+' : ''}{metrics.userGrowth.growthRate.toFixed(1)}% growth
                  </p>
                </div>
              </Card>

              <Card className="bg-white">
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Total Matches</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics.matchCompletion.totalMatches}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {metrics.matchCompletion.completedMatches} completed
                  </p>
                </div>
              </Card>

              <Card className="bg-white">
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {metrics.matchCompletion.completionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {metrics.matchCompletion.cancelledMatches} cancelled
                  </p>
                </div>
              </Card>
            </div>

            {/* Popular Courts */}
            <Card className="bg-white">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Courts</h2>
                <div className="space-y-3">
                  {metrics.popularCourts.slice(0, 5).map((court, index) => (
                    <div key={court.courtId} className="flex justify-between items-center border-b border-gray-200 pb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-semibold text-gray-400">#{index + 1}</span>
                        <span className="font-medium text-gray-900">{court.courtName}</span>
                      </div>
                      <span className="text-sm text-gray-600">{court.matchCount} matches</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* ELO Distribution */}
            <Card className="bg-white">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">ELO Distribution</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.eloDistribution.ranges.map((range) => (
                    <div key={range.range} className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{range.count}</p>
                      <p className="text-sm text-gray-600">{range.range}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </>
        )}

        {!metrics && (
          <Card className="bg-white">
            <div className="p-6 text-center">
              <p className="text-gray-600">Unable to load dashboard metrics</p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}

