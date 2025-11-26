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

  const userGrowth = analytics?.userGrowth;
  const matchCompletion = analytics?.matchCompletion;
  const popularCourts = analytics?.popularCourts || [];
  const eloDistribution = analytics?.eloDistribution;
  const peakUsage = analytics?.peakUsage;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <PageLoader text="Loading analytics..." />
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-3xl font-bold text-blue-600 mt-2">
                        {userGrowth?.totalUsers || 0}
                      </p>
                      {userGrowth?.newUsersLast30Days > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          +{userGrowth.newUsersLast30Days} this month
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {userGrowth?.activeUsers || 0}
                      </p>
                      {userGrowth?.totalUsers > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {((userGrowth.activeUsers / userGrowth.totalUsers) * 100).toFixed(1)}% of total
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Matches</p>
                      <p className="text-3xl font-bold text-purple-600 mt-2">
                        {matchCompletion?.totalMatches || 0}
                      </p>
                      {matchCompletion?.completedMatches > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {matchCompletion.completedMatches} completed
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Match Completion Rate</p>
                      <p className="text-3xl font-bold text-orange-600 mt-2">
                        {matchCompletion?.completionRate?.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {matchCompletion?.completedMatches || 0} / {matchCompletion?.totalMatches || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Match Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-600">Pending Matches</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {matchCompletion?.pendingMatches || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-600">Confirmed Matches</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {matchCompletion?.confirmedMatches || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-600">Completed Matches</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {matchCompletion?.completedMatches || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-600">Cancelled Matches</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {matchCompletion?.cancelledMatches || 0}
                  </p>
                </div>
              </Card>
            </div>

            {/* User Growth & Popular Courts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="User Growth (Last 6 Months)">
                {userGrowth?.monthlyGrowth && userGrowth.monthlyGrowth.length > 0 ? (
                  <div className="space-y-2">
                    {userGrowth.monthlyGrowth.map((month: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{month.month}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min((month.count / Math.max(...userGrowth.monthlyGrowth.map((m: any) => m.count))) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8 text-right">
                            {month.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No growth data available</p>
                )}
              </Card>

              <Card title="Popular Courts (Top 10)">
                {popularCourts.length > 0 ? (
                  <div className="space-y-2">
                    {popularCourts.slice(0, 10).map((court: any, index: number) => (
                      <div key={court.courtId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{court.courtName}</p>
                          <p className="text-xs text-gray-500">{court.surfaceType || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{court.matchCount}</p>
                          <p className="text-xs text-gray-500">matches</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No court data available</p>
                )}
              </Card>
            </div>

            {/* ELO Distribution */}
            {eloDistribution && eloDistribution.singles && eloDistribution.doubles && (
              <Card title="ELO Distribution">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Singles</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Average:</span>
                        <span className="font-medium">{eloDistribution.singles?.average?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Range:</span>
                        <span className="font-medium">
                          {eloDistribution.singles?.min || 0} - {eloDistribution.singles?.max || 0}
                        </span>
                      </div>
                      {eloDistribution.singles?.distribution && Array.isArray(eloDistribution.singles.distribution) && (
                        <div className="mt-4 space-y-1">
                          {eloDistribution.singles.distribution.map((dist: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{dist.range}:</span>
                              <span className="font-medium">{dist.count} players</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Doubles</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Average:</span>
                        <span className="font-medium">{eloDistribution.doubles?.average?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Range:</span>
                        <span className="font-medium">
                          {eloDistribution.doubles?.min || 0} - {eloDistribution.doubles?.max || 0}
                        </span>
                      </div>
                      {eloDistribution.doubles?.distribution && Array.isArray(eloDistribution.doubles.distribution) && (
                        <div className="mt-4 space-y-1">
                          {eloDistribution.doubles.distribution.map((dist: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{dist.range}:</span>
                              <span className="font-medium">{dist.count} players</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Peak Usage */}
            {peakUsage && (
              <Card title="Peak Usage Times">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Peak Days</h4>
                    {peakUsage.peakDays && peakUsage.peakDays.length > 0 ? (
                      <div className="space-y-2">
                        {peakUsage.peakDays.map((day: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{day.day}</span>
                            <span className="text-sm font-medium text-gray-900">{day.count} matches</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No data available</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Peak Hours</h4>
                    {peakUsage.peakHours && peakUsage.peakHours.length > 0 ? (
                      <div className="space-y-2">
                        {peakUsage.peakHours.map((hour: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{hour.hour || 'N/A'}</span>
                            <span className="text-sm font-medium text-gray-900">{hour.matchCount || hour.count || 0} matches</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No data available</p>
                    )}
                  </div>
                </div>
              </Card>
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
          </>
        )}
      </div>
    </Layout>
  );
}
