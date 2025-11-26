'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { PageLoader } from '@/components/ui/PageLoader';
import { adminApi } from '@/lib/admin';
import { courtsApi } from '@/lib/courts';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Match, Court } from '@/types';
import { format } from 'date-fns';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, user: currentUser, isAdmin } = useRequireAdmin();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [isSavingCourt, setIsSavingCourt] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    if (currentUser?.role !== 'admin') {
      router.push('/');
      return;
    }

    setIsLoading(true);
    Promise.all([
      adminApi.getUserById(userId),
      courtsApi.getDropdown(),
      adminApi.getUserMatches(userId),
      adminApi.getUserStats(userId),
    ])
      .then(([userData, courtsData, matchesData, statsData]) => {
        setUser(userData);
        setCourts(courtsData);
        setMatches(matchesData);
        setUserStats(statsData);
        setSelectedCourtId(userData.homeCourtId || '');
      })
      .catch((err) => {
        console.error('Failed to load user data:', err);
      })
      .finally(() => setIsLoading(false));
  }, [userId, currentUser?.id, currentUser?.role]); // Only depend on user ID and role

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    
    setIsSuspending(true);
    try {
      const updatedUser = await adminApi.suspendUser(userId, {
        reason: suspendReason,
      });
      setUser(updatedUser);
      setShowSuspendModal(false);
      setSuspendReason('');
    } catch (error) {
      console.error('Failed to suspend user:', error);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleBan = async () => {
    if (!banReason.trim()) return;
    
    setIsBanning(true);
    try {
      const updatedUser = await adminApi.banUser(userId, banReason);
      setUser(updatedUser);
      setShowBanModal(false);
      setBanReason('');
    } catch (error) {
      console.error('Failed to ban user:', error);
    } finally {
      setIsBanning(false);
    }
  };

  const handleSaveCourt = async () => {
    if (!selectedCourtId) return;
    
    setIsSavingCourt(true);
    try {
      const updatedUser = await adminApi.setUserHomeCourt(userId, selectedCourtId);
      setUser(updatedUser);
      setShowCourtModal(false);
    } catch (error) {
      console.error('Failed to set home court:', error);
    } finally {
      setIsSavingCourt(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">User not found</p>
          <Button variant="outline" onClick={() => router.push('/admin/users')} className="mt-4">
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            Back to Users
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="User Information">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Name:</span>{' '}
                <span className="text-gray-900">{user.firstName} {user.lastName}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>{' '}
                <span className="text-gray-900">{user.email}</span>
              </div>
              {user.phone && (
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>{' '}
                  <span className="text-gray-900">{user.phone}</span>
                  {user.phoneVerified && (
                    <span className="ml-2 text-xs text-green-600">✓ Verified</span>
                  )}
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Role:</span>{' '}
                <span className={`px-2 py-1 rounded text-sm ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.role}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>{' '}
                <span className={`px-2 py-1 rounded text-sm ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {user.ratingType && (
                <div>
                  <span className="font-medium text-gray-700">Rating:</span>{' '}
                  <span className="text-gray-900">
                    {user.ratingType} {user.ratingValue}
                  </span>
                </div>
              )}
              {user.bio && (
                <div>
                  <span className="font-medium text-gray-700">Bio:</span>
                  <p className="text-gray-900 mt-1">{user.bio}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Member Since:</span>{' '}
                <span className="text-gray-900">
                  {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          <Card title="Actions">
            <div className="space-y-3">
              {user.isActive && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSuspendModal(true)}
                  >
                    Suspend User
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full !border-red-300 !text-red-600 hover:!bg-red-50"
                    onClick={() => setShowBanModal(true)}
                  >
                    Ban User
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/admin/users/${userId}/edit`)}
              >
                Edit User
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/stats/users/${userId}`)}
              >
                View Stats
              </Button>
            </div>
          </Card>
        </div>

        {/* User Statistics */}
        {userStats && (
          <Card title="User Statistics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Matches Created</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.matchesCreated || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Matches Participated</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.matchesParticipated || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Matches Completed</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.matchesCompleted || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.winRate?.toFixed(1) || 0}%</p>
              </div>
            </div>
            {userStats.stats && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Wins</p>
                    <p className="text-lg font-semibold text-gray-900">{userStats.stats.totalWins || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Matches</p>
                    <p className="text-lg font-semibold text-gray-900">{userStats.stats.totalMatches || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Singles ELO</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {userStats.stats.singlesElo ? Math.round(userStats.stats.singlesElo) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Doubles ELO</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {userStats.stats.doublesElo ? Math.round(userStats.stats.doublesElo) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Home Court Management */}
        <Card title="Home Court">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Home Court</p>
              <p className="text-lg font-medium text-gray-900">
                {user.homeCourt?.name || 'No home court set'}
              </p>
              {user.homeCourt?.address && (
                <p className="text-sm text-gray-500 mt-1">{user.homeCourt.address}</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCourtModal(true)}
            >
              {user.homeCourtId ? 'Change Court' : 'Set Home Court'}
            </Button>
          </div>
        </Card>

        {/* User Matches */}
        <Card title="User Matches">
          <div className="mb-4 text-sm text-gray-600">
            Showing {matches.length} matches (as creator and participant)
          </div>
          {matches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Court
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches.slice(0, 10).map((match) => {
                    const isCreator = match.creatorUserId === userId;
                    const opponent = match.slots?.find(slot => 
                      slot.applications?.some(app => 
                        app.status?.toLowerCase() === 'confirmed' && app.applicantUserId !== userId
                      )
                    )?.applications?.find(app => app.status?.toLowerCase() === 'confirmed')?.applicant;
                    
                    return (
                      <tr key={match.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(match.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {match.court?.name || 'TBD'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            match.status?.toLowerCase() === 'confirmed' ? 'bg-green-100 text-green-800' :
                            match.status?.toLowerCase() === 'completed' ? 'bg-blue-100 text-blue-800' :
                            match.status?.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {match.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isCreator ? 'Creator' : 'Participant'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/matches/${match.id}`)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {matches.length > 10 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/admin/users/${userId}/matches`)}
                  >
                    View All Matches ({matches.length})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No matches found</p>
          )}
        </Card>

        {/* Court Selection Modal */}
        {showCourtModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Set Home Court</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Court
                  </label>
                  <select
                    value={selectedCourtId}
                    onChange={(e) => setSelectedCourtId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">No home court</option>
                    {courts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.name} - {court.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleSaveCourt}
                    disabled={isSavingCourt}
                  >
                    {isSavingCourt ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCourtModal(false);
                      setSelectedCourtId(user?.homeCourtId || '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Suspend Modal */}
        {showSuspendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Suspend User</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for suspension
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Enter reason for suspension..."
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleSuspend}
                    disabled={isSuspending || !suspendReason.trim()}
                  >
                    {isSuspending ? 'Suspending...' : 'Suspend'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowSuspendModal(false);
                      setSuspendReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Ban Modal */}
        {showBanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4 text-red-600">Ban User</h2>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  This action cannot be undone. The user will be permanently banned.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for ban
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Enter reason for ban..."
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    className="flex-1 !bg-red-600 hover:!bg-red-700"
                    onClick={handleBan}
                    disabled={isBanning || !banReason.trim()}
                  >
                    {isBanning ? 'Banning...' : 'Ban User'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowBanModal(false);
                      setBanReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

