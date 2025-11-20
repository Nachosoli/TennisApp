'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { statsApi } from '@/lib/stats';
import { matchesApi } from '@/lib/matches';
import { authApi } from '@/lib/auth';
import { applicationsApi } from '@/lib/applications';
import { getErrorMessage } from '@/lib/errors';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserStats, Match, User } from '@/types';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

export default function DashboardPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const { setUser } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [withdrawingApplicationId, setWithdrawingApplicationId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<string | null>(null);

  // Fetch fresh user data when component mounts to ensure home court is loaded
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const freshUser = await authApi.getCurrentUser();
        setUser(freshUser);
      } catch (error) {
        console.error('Failed to fetch fresh user data:', error);
        // Don't show error to user, just use cached data
      }
    };

    if (user) {
      fetchUserData();
    }
  }, []); // Only run once on mount

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setDataLoading(true);
    try {
      const [userStats, matches] = await Promise.all([
        statsApi.getUserStats(user.id).catch(() => null),
        matchesApi.getMyMatches().catch(() => []),
      ]);
      setStats(userStats);
      // Filter out any cancelled matches that might still exist in database
      const activeMatches = (matches || []).filter(match => match.status !== 'cancelled');
      setRecentMatches(activeMatches.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

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

  if (dataLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  const handleDeleteMatch = async (matchId: string) => {
    try {
      setDeletingMatchId(matchId);
      setActionError(null);
      await matchesApi.cancel(matchId);
      // Refresh matches list
      const matches = await matchesApi.getMyMatches();
      // Filter out any cancelled matches that might still exist
      const activeMatches = (matches || []).filter(match => match.status !== 'cancelled');
      setRecentMatches(activeMatches.slice(0, 5));
      setShowDeleteConfirm(null);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setActionError(errorMessage);
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleWithdrawFromMatch = async (applicationId: string) => {
    try {
      setWithdrawingApplicationId(applicationId);
      setActionError(null);
      await applicationsApi.withdraw(applicationId);
      // Refresh matches list
      const matches = await matchesApi.getMyMatches();
      // Filter out any cancelled matches that might still exist
      const activeMatches = (matches || []).filter(match => match.status !== 'cancelled');
      setRecentMatches(activeMatches.slice(0, 5));
      setShowWithdrawConfirm(null);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setActionError(errorMessage);
    } finally {
      setWithdrawingApplicationId(null);
    }
  };

  const handleReportScore = (matchId: string) => {
    router.push(`/matches/${matchId}/score`);
  };

  const eloRating = stats?.singlesElo || 1500;
  const winStreak = stats?.winStreakSingles || 0;
  const totalMatches = stats?.totalMatches || 0;
  const winRate = stats && stats.totalMatches > 0
    ? ((stats.totalWins / stats.totalMatches) * 100).toFixed(0)
    : '0';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-lg text-gray-600 mt-2">Ready to play some tennis?</p>
        </div>

        {/* Home Court Warning */}
        {!user.homeCourtId && (
          <Card className="bg-yellow-50 border-yellow-200 border-2">
            <div className="p-4 flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  Home Court Required
                </h3>
                <p className="text-sm text-yellow-700 mb-3">
                  You need to set a home court before you can create matches. 
                  Without a home court, you can only join matches as a visitor.
                </p>
                <Link href="/profile">
                  <Button
                    variant="primary"
                    size="sm"
                  >
                    Add Home Facility
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{eloRating}</p>
                <p className="text-sm text-gray-600">ELO Rating</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{winStreak}</p>
                <p className="text-sm text-gray-600">Win Streak</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalMatches}</p>
                <p className="text-sm text-gray-600">Total Matches</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{winRate}%</p>
                <p className="text-sm text-gray-600">Win Rate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Create New Match</h3>
                <p className="text-gray-600 mb-4">Set up a new match and find opponents</p>
                {user.homeCourtId ? (
                  <Link href="/matches/create">
                    <Button variant="primary" className="bg-green-600 hover:bg-green-700">
                      Create Match
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="primary" 
                    className="bg-gray-400 hover:bg-gray-400 cursor-not-allowed" 
                    disabled
                    title="Please set a home court in your profile to create matches"
                  >
                    Create Match
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="bg-white p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">View Calendar</h3>
                <p className="text-gray-600 mb-4">See all available matches in your area</p>
                <Link href="/calendar">
                  <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                    Browse Matches
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Matches Section */}
        <Card className="bg-white">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Matches</h2>
            <p className="text-gray-600 mb-6">Your tennis matches</p>

            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {actionError}
                <button
                  onClick={() => setActionError(null)}
                  className="ml-2 text-red-800 hover:text-red-900 font-medium"
                >
                  ×
                </button>
              </div>
            )}

            {recentMatches.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 mb-2">No recent matches yet</p>
                <p className="text-sm text-gray-500">Create your first match to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Opponent</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Score</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Facility</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentMatches.map((match) => {
                      // Determine opponent
                      const isCreator = match.creatorUserId === user?.id;
                      let opponent: User | null = null;
                      let opponentName = 'TBD';
                      
                      if (isCreator) {
                        // User is creator, find applicant from confirmed slot
                        const confirmedSlot = match.slots?.find(slot => 
                          slot.application?.status === 'CONFIRMED'
                        );
                        if (confirmedSlot?.application?.applicant) {
                          opponent = confirmedSlot.application.applicant;
                          opponentName = `${opponent.firstName} ${opponent.lastName}`;
                        } else if (confirmedSlot?.application?.user) {
                          opponent = confirmedSlot.application.user;
                          opponentName = `${opponent.firstName} ${opponent.lastName}`;
                        }
                      } else {
                        // User is applicant, opponent is creator
                        if (match.creator) {
                          opponent = match.creator;
                          opponentName = `${opponent.firstName} ${opponent.lastName}`;
                        }
                      }

                      // Get score from result
                      const result = match.results?.[0];
                      const score = result?.score || '';

                      // Determine status
                      const matchDate = new Date(match.date);
                      const now = new Date();
                      const isPast = matchDate < now;
                      let statusText = match.status;
                      let statusClass = 'bg-gray-100 text-gray-800';
                      
                      if (match.status === 'completed') {
                        statusText = 'Completed';
                        statusClass = 'bg-blue-100 text-blue-800';
                      } else if (isPast && match.status !== 'completed') {
                        statusText = 'Report Score';
                        statusClass = 'bg-yellow-100 text-yellow-800';
                      } else {
                        statusText = 'Upcoming';
                        statusClass = 'bg-green-100 text-green-800';
                      }

                      // Check if facility is user's home court
                      const isHomeCourt = match.courtId === user?.homeCourtId;

                      // Find user's application if they're a participant
                      const userApplication = match.slots?.find(slot => 
                        slot.application?.applicantUserId === user?.id || slot.application?.userId === user?.id
                      )?.application;

                      // Check if match has confirmed participants
                      const hasConfirmedParticipants = match.slots?.some(slot => 
                        slot.application?.status === 'CONFIRMED'
                      ) || false;

                      // Determine if user can report score
                      const canReportScore = isPast && !score && (isCreator || userApplication?.status === 'CONFIRMED');
                      
                      // Determine if user can delete (creator only, not completed)
                      const canDelete = isCreator && match.status !== 'completed';
                      
                      // Determine if user can edit (creator only, match is pending, no confirmed participants)
                      const canEdit = isCreator && match.status === 'pending' && !hasConfirmedParticipants;
                      
                      // Determine if user can withdraw (participant with confirmed application, not completed)
                      const canWithdraw = !isCreator && userApplication?.status === 'CONFIRMED' && match.status !== 'completed';

                      return (
                        <tr
                          key={match.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/matches/${match.id}`)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(match.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800">
                            {opponentName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {score || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center">
                              {isHomeCourt && (
                                <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                </svg>
                              )}
                              <span className="text-blue-600 hover:text-blue-800">
                                {match.court?.name || 'Court'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {canReportScore && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReportScore(match.id)}
                                >
                                  Report Score
                                </Button>
                              )}
                              {canEdit && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/matches/${match.id}/edit`)}
                                >
                                  Edit
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setShowDeleteConfirm(match.id)}
                                  isLoading={deletingMatchId === match.id}
                                  disabled={deletingMatchId === match.id}
                                >
                                  Delete
                                </Button>
                              )}
                              {canWithdraw && userApplication && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowWithdrawConfirm(userApplication.id)}
                                  isLoading={withdrawingApplicationId === userApplication.id}
                                  disabled={withdrawingApplicationId === userApplication.id}
                                >
                                  Remove Myself
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Match</h2>
            {(() => {
              const match = recentMatches.find(m => m.id === showDeleteConfirm);
              const hasConfirmed = match?.slots?.some(slot => 
                slot.application?.status === 'CONFIRMED'
              ) || false;
              return hasConfirmed && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                  <p className="text-sm font-medium">Warning: This match has confirmed participants.</p>
                  <p className="text-sm mt-1">Cancelling may result in ELO penalties (1 free cancellation per 3 months).</p>
                </div>
              );
            })()}
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this match? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={() => handleDeleteMatch(showDeleteConfirm)}
                isLoading={deletingMatchId === showDeleteConfirm}
                disabled={deletingMatchId === showDeleteConfirm}
                className="flex-1"
              >
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingMatchId === showDeleteConfirm}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Remove Yourself from Match</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove yourself from this match? This will free up the slot for other players.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => handleWithdrawFromMatch(showWithdrawConfirm)}
                isLoading={withdrawingApplicationId === showWithdrawConfirm}
                disabled={withdrawingApplicationId === showWithdrawConfirm}
                className="flex-1"
              >
                Remove Myself
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWithdrawConfirm(null)}
                disabled={withdrawingApplicationId === showWithdrawConfirm}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Home Court Modal */}
    </Layout>
  );
}

