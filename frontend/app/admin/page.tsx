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
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Admin Dashboard</h1>

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
                      {userGrowth?.newUsersLast30Days && userGrowth.newUsersLast30Days > 0 && (
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
                      {userGrowth?.totalUsers && userGrowth.totalUsers > 0 && userGrowth?.activeUsers !== undefined && (
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
                      {matchCompletion?.completedMatches && matchCompletion.completedMatches > 0 && (
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
                {userGrowth?.monthlyGrowth && Array.isArray(userGrowth.monthlyGrowth) && userGrowth.monthlyGrowth.length > 0 ? (
                  <div className="space-y-2">
                    {userGrowth.monthlyGrowth.map((month: any, index: number) => {
                      const maxCount = Math.max(...userGrowth.monthlyGrowth.map((m: any) => m.count || 0), 1);
                      const percentage = maxCount > 0 ? Math.min((month.count || 0) / maxCount * 100, 100) : 0;
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{month.month}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8 text-right">
                              {month.count || 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
                    {peakUsage.peakDays && Array.isArray(peakUsage.peakDays) && peakUsage.peakDays.length > 0 ? (
                      <div className="space-y-2">
                        {peakUsage.peakDays.map((day: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{day.day || 'N/A'}</span>
                            <span className="text-sm font-medium text-gray-900">{day.matchCount || day.count || 0} matches</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No data available</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Peak Hours</h4>
                    {peakUsage.peakHours && Array.isArray(peakUsage.peakHours) && peakUsage.peakHours.length > 0 ? (
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
            <Card title="Management">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="primary"
                  className="w-full py-6 text-lg font-semibold"
                  onClick={() => router.push('/admin/users')}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Manage Users
                  </div>
                </Button>
                <Button
                  variant="primary"
                  className="w-full py-6 text-lg font-semibold"
                  onClick={() => router.push('/admin/courts')}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Manage Courts
                  </div>
                </Button>
                <Button
                  variant="primary"
                  className="w-full py-6 text-lg font-semibold"
                  onClick={() => router.push('/admin/matches')}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Manage Matches
                  </div>
                </Button>
              </div>
            </Card>

            {/* Database Operations */}
            <Card title="Database Operations">
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> These operations are destructive and cannot be undone. Use with extreme caution.
                  </p>
                </div>

                {migrationMessage && (
                  <div
                    className={`rounded-md p-4 ${
                      migrationMessage.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {migrationMessage.text}
                  </div>
                )}

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Wipe Database (Keep Courts)
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Deletes all data from the database except the courts table. This will remove all users, matches, applications, notifications, and other data. Courts will be preserved.
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          '⚠️ WARNING: This will delete ALL data except courts!\n\n' +
                          'This includes:\n' +
                          '- All users\n' +
                          '- All matches\n' +
                          '- All applications\n' +
                          '- All notifications\n' +
                          '- All other data\n\n' +
                          'Courts will be preserved.\n\n' +
                          'This action CANNOT be undone!\n\n' +
                          'Are you absolutely sure you want to continue?'
                        );
                        
                        if (!confirmed) {
                          return;
                        }

                        // Prompt for password
                        const password = window.prompt(
                          '🔒 Password Verification Required\n\n' +
                          'Please enter your admin password to confirm this action:'
                        );

                        if (!password) {
                          setMigrationMessage({
                            type: 'error',
                            text: 'Password verification cancelled. Database wipe aborted.',
                          });
                          setTimeout(() => setMigrationMessage(null), 5000);
                          return;
                        }

                        if (password.length < 8) {
                          setMigrationMessage({
                            type: 'error',
                            text: 'Password must be at least 8 characters long.',
                          });
                          setTimeout(() => setMigrationMessage(null), 5000);
                          return;
                        }

                        const doubleConfirm = window.confirm(
                          'FINAL CONFIRMATION:\n\n' +
                          'You are about to DELETE ALL DATA except courts.\n\n' +
                          'This action CANNOT be undone!\n\n' +
                          'Click OK to proceed with the database wipe.'
                        );

                        if (!doubleConfirm) {
                          return;
                        }

                        setMigrationLoading(true);
                        setMigrationMessage(null);
                        try {
                          const result = await adminApi.wipeDatabaseExceptCourts(password);
                          if (result.success) {
                            setMigrationMessage({
                              type: 'success',
                              text: result.message || 'Database wiped successfully!',
                            });
                          } else {
                            setMigrationMessage({
                              type: 'error',
                              text: result.message || 'Database wipe failed. Please check the logs.',
                            });
                          }
                        } catch (error: any) {
                          setMigrationMessage({
                            type: 'error',
                            text: error.response?.data?.message || error.message || 'Failed to wipe database. Please try again.',
                          });
                        } finally {
                          setMigrationLoading(false);
                          // Clear message after 15 seconds
                          setTimeout(() => setMigrationMessage(null), 15000);
                        }
                      }}
                      isLoading={migrationLoading}
                      disabled={migrationLoading}
                    >
                      Wipe Database
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
