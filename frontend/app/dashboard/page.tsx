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
import { parseLocalDate } from '@/lib/date-utils';

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
      // Filter out cancelled matches and matches where user has rejected application
      const activeMatches = (matches || []).filter(match => {
        if (match.status?.toLowerCase() === 'cancelled') return false;
        
        // Check if user has rejected application
        const hasRejectedApplication = match.slots?.some(slot =>
          slot.applications?.some(app =>
            (app.applicantUserId === user.id || app.userId === user.id) &&
            app.status?.toLowerCase() === 'rejected'
          )
        );
        if (hasRejectedApplication) return false;
        
        return true;
      });
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
      const activeMatches = (matches || []).filter(match => match.status?.toLowerCase() !== 'cancelled');
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
      const activeMatches = (matches || []).filter(match => match.status?.toLowerCase() !== 'cancelled');
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mt-2">Ready to play some tennis?</p>
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

        {/* Performance Overview Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Performance Overview</h2>
          <Link 
            href="/stats" 
            className="text-sm text-gray-600 hover:text-blue-600 flex items-center space-x-1 transition-colors"
          >
            <span>View Full Statistics</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Statistics Cards - 4 icons in 1 row on mobile, optimized spacing */}
        <div className="grid grid-cols-4 md:grid-cols-4 gap-1.5 sm:gap-6">
          <Card className="bg-white p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-3">
              <div className="bg-green-100 rounded-lg p-1.5 sm:p-3">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-base sm:text-2xl font-bold text-gray-900">{eloRating}</p>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">ELO</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-3">
              <div className="bg-green-100 rounded-lg p-1.5 sm:p-3">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-base sm:text-2xl font-bold text-gray-900">{winStreak}</p>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Streak</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-3">
              <div className="bg-green-100 rounded-lg p-1.5 sm:p-3">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-base sm:text-2xl font-bold text-gray-900">{totalMatches}</p>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Matches</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-3">
              <div className="bg-green-100 rounded-lg p-1.5 sm:p-3">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-base sm:text-2xl font-bold text-gray-900">{winRate}%</p>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Win Rate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Sections - Compact 2-column layout */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-white p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-green-100 rounded-lg p-2 sm:p-2.5">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1 w-full">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Create Match</h3>
                {user.homeCourtId ? (
                  <Link href="/matches/create">
                    <Button variant="primary" size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                      Create
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="w-full bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-xs sm:text-sm" 
                    disabled
                    title="Please set a home court in your profile to create matches"
                  >
                    Create
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="bg-white p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-green-100 rounded-lg p-2 sm:p-2.5">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 w-full">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">View Calendar</h3>
                <Link href="/calendar">
                  <Button variant="outline" size="sm" className="w-full border-green-600 text-green-600 hover:bg-green-50 text-xs sm:text-sm">
                    Browse
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Matches Section */}
        <Card className="bg-white">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Matches</h2>
              {recentMatches.length > 3 && (
                <p className="text-xs sm:text-sm text-gray-500 italic">Scroll down for more matches</p>
              )}
            </div>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Your tennis matches</p>

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
              <>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {recentMatches.map((match) => {
                    // Determine opponent
                    const isCreator = match.creatorUserId === user?.id;
                    let opponent: User | null = null;
                    let opponentName = 'TBD';
                    
                    if (isCreator) {
                      const confirmedSlot = match.slots?.find(slot => 
                        slot.status?.toLowerCase() === 'confirmed'
                      );
                      if (confirmedSlot?.applications) {
                        const confirmedApplication = confirmedSlot.applications.find(app => 
                          app.status?.toLowerCase() === 'confirmed'
                        );
                        if (confirmedApplication?.applicant) {
                          opponent = confirmedApplication.applicant;
                          opponentName = `${opponent.firstName} ${opponent.lastName}`;
                        } else if (confirmedApplication?.user) {
                          opponent = confirmedApplication.user;
                          opponentName = `${opponent.firstName} ${opponent.lastName}`;
                        }
                      }
                    } else {
                      if (match.creator) {
                        opponent = match.creator;
                        opponentName = `${opponent.firstName} ${opponent.lastName}`;
                      }
                    }

                    const result = match.results?.[0];
                    const score = result?.score || '';
                    const isHomeCourt = match.courtId === user?.homeCourtId;
                    
                    // Find all user applications across all slots and prioritize confirmed
                    let userApplication = null;
                    let confirmedApplication = null;
                    for (const slot of match.slots || []) {
                      if (slot.applications) {
                        const apps = slot.applications.filter(app => 
                          app.applicantUserId === user?.id || app.userId === user?.id
                        );
                        // Prioritize confirmed application
                        const confirmed = apps.find(app => app.status?.toLowerCase() === 'confirmed');
                        if (confirmed) {
                          confirmedApplication = confirmed;
                        }
                        // Use first application found if no confirmed one yet
                        if (!userApplication && apps.length > 0) {
                          userApplication = apps[0];
                        }
                      }
                    }
                    // Use confirmed application if available, otherwise use first found
                    userApplication = confirmedApplication || userApplication;

                    // Check for confirmed application first (highest priority for applicants)
                    const hasConfirmedApplication = confirmedApplication !== null;
                    
                    // Check for waitlisted application (only if no confirmed)
                    const hasWaitlistedApplication = !hasConfirmedApplication && match.slots?.some(slot =>
                      slot.applications?.some(app =>
                        (app.applicantUserId === user?.id || app.userId === user?.id) &&
                        app.status?.toLowerCase() === 'waitlisted'
                      )
                    ) || false;
                    
                    // Check for pending application (only if match is still pending)
                    const hasPendingApplication = match.status?.toLowerCase() === 'pending' && match.slots?.some(slot =>
                      slot.applications?.some(app =>
                        (app.applicantUserId === user?.id || app.userId === user?.id) &&
                        app.status?.toLowerCase() === 'pending'
                      )
                    ) || false;
                    
                    // Check if user has any applications
                    const hasAnyUserApplications = match.slots?.some(slot =>
                      slot.applications?.some(app =>
                        (app.applicantUserId === user?.id || app.userId === user?.id)
                      )
                    ) || false;
                    
                    const matchDate = parseLocalDate(match.date);
                    const now = new Date();
                    const isPast = matchDate < now;
                    let statusText: string = match.status;
                    let statusClass = 'bg-gray-100 text-gray-800';
                    
                    if (match.status?.toLowerCase() === 'completed') {
                      statusText = 'Completed';
                      statusClass = 'bg-gray-700 text-white';
                    } else if (hasWaitlistedApplication || (match.status?.toLowerCase() === 'confirmed' && !hasConfirmedApplication && hasAnyUserApplications)) {
                      // Waitlisted: user has waitlisted app (and no confirmed) OR match is confirmed (not with them) and they have applications
                      statusText = 'Waitlisted';
                      statusClass = 'bg-orange-100 text-orange-800';
                    } else if (hasConfirmedApplication || (isCreator && match.status?.toLowerCase() === 'confirmed')) {
                      // Confirmed: user has confirmed app OR creator of confirmed match
                      statusText = 'Confirmed';
                      statusClass = 'bg-green-100 text-green-800';
                    } else if (hasPendingApplication) {
                      // Applied: only if match is still pending
                      statusText = 'Applied';
                      statusClass = 'bg-blue-100 text-blue-800';
                    } else if (!score && (match.status?.toLowerCase() === 'confirmed' || match.status?.toLowerCase() === 'completed') && (isCreator || hasConfirmedApplication)) {
                      // Report Score: confirmed/completed match without score
                      statusText = 'Report Score';
                      statusClass = 'bg-yellow-100 text-yellow-800';
                    } else if (match.status?.toLowerCase() === 'pending' && isCreator) {
                      // Pending: for creators only
                      const pendingAndWaitlistedCount = match.slots?.reduce((count, slot) => {
                        return count + (slot.applications?.filter(app => {
                          const status = app.status?.toLowerCase();
                          return status === 'pending' || status === 'waitlisted';
                        }).length || 0);
                      }, 0) || 0;
                      if (pendingAndWaitlistedCount > 0) {
                        statusText = `Pending (${pendingAndWaitlistedCount} applicant${pendingAndWaitlistedCount > 1 ? 's' : ''})`;
                      } else {
                        statusText = 'Pending';
                      }
                      statusClass = 'bg-yellow-100 text-yellow-800';
                    } else {
                      statusText = 'Upcoming';
                      statusClass = 'bg-green-100 text-green-800';
                    }

                    // Check if match has any applicants (pending, confirmed, waitlisted)
                    const hasAnyApplicants = match.slots?.some(slot => 
                      slot.applications && slot.applications.length > 0 &&
                      slot.applications.some(app => 
                        app.status?.toLowerCase() === 'pending' || 
                        app.status?.toLowerCase() === 'confirmed' || 
                        app.status?.toLowerCase() === 'waitlisted'
                      )
                    ) || false;
                    const isConfirmed = match.status?.toLowerCase() === 'confirmed';
                    const isCompleted = match.status?.toLowerCase() === 'completed';
                    const isCompletedWithScore = isCompleted && score;
                    
                    // Update canReportScore to include completed matches without score
                    const canReportScore = !score && (isConfirmed || isCompleted) && (isCreator || hasConfirmedApplication);
                    
                    // Cancel (renamed from Delete): creator can cancel non-completed matches
                    const canCancel = isCreator && !isCompleted;
                    
                    // Show Edit if pending and no applicants, Manage if pending with applicants
                    const canEdit = isCreator && match.status?.toLowerCase() === 'pending' && !hasAnyApplicants;
                    const canManage = isCreator && match.status?.toLowerCase() === 'pending' && hasAnyApplicants;
                    
                    // Withdraw: show for all applicants (pending, waitlisted, confirmed) if match not completed
                    const hasAnyUserApplication = match.slots?.some(slot =>
                      slot.applications?.some(app =>
                        (app.applicantUserId === user?.id || app.userId === user?.id) &&
                        (app.status?.toLowerCase() === 'pending' || 
                         app.status?.toLowerCase() === 'waitlisted' || 
                         app.status?.toLowerCase() === 'confirmed')
                      )
                    ) || false;
                    const canWithdraw = !isCreator && hasAnyUserApplication && !isCompleted;

                    return (
                      <div
                        key={match.id}
                        className={`bg-white border border-gray-200 rounded-lg p-4 space-y-3 ${
                          isCompletedWithScore 
                            ? 'opacity-60 bg-gray-50 cursor-not-allowed' 
                            : 'cursor-pointer'
                        }`}
                        onClick={isCompletedWithScore ? undefined : () => router.push(`/matches/${match.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                {statusText}
                              </span>
                              <span className="text-sm text-gray-900">
                                {parseLocalDate(match.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">{match.court?.name || 'Court'}</h3>
                            <div className="flex items-center text-sm text-gray-600">
                              {isHomeCourt && (
                                <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                </svg>
                              )}
                              <span>vs {opponentName}</span>
                            </div>
                            {score && (
                              <p className="text-sm text-gray-700 mt-1">Score: {score}</p>
                            )}
                          </div>
                        </div>
                        {!isCompletedWithScore && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                            {canReportScore && (
                              <Link href={`/matches/${match.id}/score`} className="flex-1 min-w-[120px]">
                                <Button variant="primary" size="sm" className="w-full">
                                  Report Score
                                </Button>
                              </Link>
                            )}
                            {canEdit && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/matches/${match.id}/edit`)}
                                className="flex-1 min-w-[100px]"
                              >
                                Edit
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/matches/${match.id}`)}
                                className="flex-1 min-w-[100px]"
                              >
                                Manage
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
                                className="flex-1 min-w-[120px]"
                              >
                                Withdraw
                              </Button>
                            )}
                            {(isCreator || hasConfirmedApplication || userApplication?.status?.toLowerCase() === 'confirmed') && match.status?.toLowerCase() === 'confirmed' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/matches/${match.id}`)}
                                className="flex-1 min-w-[100px]"
                              >
                                Chat
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(match.id)}
                                isLoading={deletingMatchId === match.id}
                                disabled={deletingMatchId === match.id}
                                className="flex-1 min-w-[100px]"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
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
                          slot.status?.toLowerCase() === 'confirmed'
                        );
                        if (confirmedSlot?.applications) {
                          const confirmedApplication = confirmedSlot.applications.find(app => 
                            app.status?.toLowerCase() === 'confirmed'
                          );
                          if (confirmedApplication?.applicant) {
                            opponent = confirmedApplication.applicant;
                            opponentName = `${opponent.firstName} ${opponent.lastName}`;
                          } else if (confirmedApplication?.user) {
                            opponent = confirmedApplication.user;
                            opponentName = `${opponent.firstName} ${opponent.lastName}`;
                          }
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

                      // Check if facility is user's home court
                      const isHomeCourt = match.courtId === user?.homeCourtId;

                      // Find all user applications across all slots and prioritize confirmed
                      let userApplication = null;
                      let confirmedApplication = null;
                      for (const slot of match.slots || []) {
                        if (slot.applications) {
                          const apps = slot.applications.filter(app => 
                            app.applicantUserId === user?.id || app.userId === user?.id
                          );
                          // Prioritize confirmed application
                          const confirmed = apps.find(app => app.status?.toLowerCase() === 'confirmed');
                          if (confirmed) {
                            confirmedApplication = confirmed;
                          }
                          // Use first application found if no confirmed one yet
                          if (!userApplication && apps.length > 0) {
                            userApplication = apps[0];
                          }
                        }
                      }
                      // Use confirmed application if available, otherwise use first found
                      userApplication = confirmedApplication || userApplication;

                      // Check for confirmed application first (highest priority for applicants)
                      const hasConfirmedApplication = confirmedApplication !== null;
                      
                      // Check for waitlisted application (only if no confirmed)
                      const hasWaitlistedApplication = !hasConfirmedApplication && match.slots?.some(slot =>
                        slot.applications?.some(app =>
                          (app.applicantUserId === user?.id || app.userId === user?.id) &&
                          app.status?.toLowerCase() === 'waitlisted'
                        )
                      ) || false;
                      
                      // Check for pending application (only if match is still pending)
                      const hasPendingApplication = match.status?.toLowerCase() === 'pending' && match.slots?.some(slot =>
                        slot.applications?.some(app =>
                          (app.applicantUserId === user?.id || app.userId === user?.id) &&
                          app.status?.toLowerCase() === 'pending'
                        )
                      ) || false;
                      
                      // Check if user has any applications
                      const hasAnyUserApplications = match.slots?.some(slot =>
                        slot.applications?.some(app =>
                          (app.applicantUserId === user?.id || app.userId === user?.id)
                        )
                      ) || false;

                      // Determine status
                      const matchDate = parseLocalDate(match.date);
                      const now = new Date();
                      const isPast = matchDate < now;
                      let statusText: string = match.status;
                      let statusClass = 'bg-gray-100 text-gray-800';
                      
                      if (match.status?.toLowerCase() === 'completed') {
                        statusText = 'Completed';
                        statusClass = 'bg-gray-700 text-white';
                      } else if (hasWaitlistedApplication || (match.status?.toLowerCase() === 'confirmed' && !hasConfirmedApplication && hasAnyUserApplications)) {
                        // Waitlisted: user has waitlisted app (and no confirmed) OR match is confirmed (not with them) and they have applications
                        statusText = 'Waitlisted';
                        statusClass = 'bg-orange-100 text-orange-800';
                      } else if (hasConfirmedApplication || (isCreator && match.status?.toLowerCase() === 'confirmed')) {
                        // Confirmed: user has confirmed app OR creator of confirmed match
                        statusText = 'Confirmed';
                        statusClass = 'bg-green-100 text-green-800';
                      } else if (hasPendingApplication) {
                        // Applied: only if match is still pending
                        statusText = 'Applied';
                        statusClass = 'bg-blue-100 text-blue-800';
                      } else if (!score && (match.status?.toLowerCase() === 'confirmed' || match.status?.toLowerCase() === 'completed') && (isCreator || hasConfirmedApplication)) {
                        // Report Score: confirmed/completed match without score
                        statusText = 'Report Score';
                        statusClass = 'bg-yellow-100 text-yellow-800';
                      } else if (match.status?.toLowerCase() === 'pending' && isCreator) {
                        // Pending: for creators only
                        const pendingAndWaitlistedCount = match.slots?.reduce((count, slot) => {
                          return count + (slot.applications?.filter(app => {
                            const status = app.status?.toLowerCase();
                            return status === 'pending' || status === 'waitlisted';
                          }).length || 0);
                        }, 0) || 0;
                        
                        if (pendingAndWaitlistedCount > 0) {
                          statusText = `Pending (${pendingAndWaitlistedCount} applicant${pendingAndWaitlistedCount > 1 ? 's' : ''})`;
                        } else {
                          statusText = 'Pending';
                        }
                        statusClass = 'bg-yellow-100 text-yellow-800';
                      } else {
                        statusText = 'Upcoming';
                        statusClass = 'bg-green-100 text-green-800';
                      }

                      // Check if match has confirmed participants
                      // Check both application status and slot status (slot becomes 'confirmed' when application is confirmed)
                      const hasConfirmedParticipants = match.slots?.some(slot => 
                        slot.applications?.some(app => app.status?.toLowerCase() === 'confirmed') || 
                        slot.status?.toLowerCase() === 'confirmed'
                      ) || false;

                      // Determine if user can report score
                      // Allow reporting for confirmed matches (even if not past date yet) and completed matches without score
                      const isConfirmed = match.status?.toLowerCase() === 'confirmed';
                      const isCompleted = match.status?.toLowerCase() === 'completed';
                      const isCompletedWithScore = isCompleted && score;
                      const canReportScore = !score && (isConfirmed || isCompleted) && (isCreator || hasConfirmedApplication);
                      
                      // Cancel (renamed from Delete): creator can cancel non-completed matches
                      const canCancel = isCreator && !isCompleted;
                      
                      // Check if match has any applicants (pending, confirmed, waitlisted)
                      const hasAnyApplicants = match.slots?.some(slot => 
                        slot.applications && slot.applications.length > 0 &&
                        slot.applications.some(app => 
                          app.status?.toLowerCase() === 'pending' || 
                          app.status?.toLowerCase() === 'confirmed' || 
                          app.status?.toLowerCase() === 'waitlisted'
                        )
                      ) || false;
                      
                      // Show Edit if pending and no applicants, Manage if pending with applicants
                      const canEdit = isCreator && match.status?.toLowerCase() === 'pending' && !hasAnyApplicants;
                      const canManage = isCreator && match.status?.toLowerCase() === 'pending' && hasAnyApplicants;
                      
                      // Withdraw: show for all applicants (pending, waitlisted, confirmed) if match not completed
                      const hasAnyUserApplication = match.slots?.some(slot =>
                        slot.applications?.some(app =>
                          (app.applicantUserId === user?.id || app.userId === user?.id) &&
                          (app.status?.toLowerCase() === 'pending' || 
                           app.status?.toLowerCase() === 'waitlisted' || 
                           app.status?.toLowerCase() === 'confirmed')
                        )
                      ) || false;
                      const canWithdraw = !isCreator && hasAnyUserApplication && !isCompleted;

                      return (
                        <tr
                          key={match.id}
                          className={isCompletedWithScore ? 'opacity-60 bg-gray-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
                          onClick={isCompletedWithScore ? undefined : () => router.push(`/matches/${match.id}`)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {parseLocalDate(match.date).toLocaleDateString('en-US', {
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
                            {score ? (
                              score
                            ) : (
                              canReportScore ? (
                                <Link 
                                  href={`/matches/${match.id}/score`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                >
                                  Report Score
                                </Link>
                              ) : (
                                '-'
                              )
                            )}
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
                              {/* Don't show any actions if match is completed with score */}
                              {!isCompletedWithScore && (
                                <>
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
                                  {canManage && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => router.push(`/matches/${match.id}`)}
                                    >
                                      Manage
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
                                      Withdraw
                                    </Button>
                                  )}
                                  {/* Chat button for confirmed matches */}
                                  {(isCreator || hasConfirmedApplication || userApplication?.status?.toLowerCase() === 'confirmed') && match.status?.toLowerCase() === 'confirmed' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => router.push(`/matches/${match.id}`)}
                                    >
                                      Chat
                                    </Button>
                                  )}
                                  {/* Cancel button should always be last */}
                                  {canCancel && (
                                    <Button
                                      type="button"
                                      variant="danger"
                                      size="sm"
                                      onClick={() => setShowDeleteConfirm(match.id)}
                                      isLoading={deletingMatchId === match.id}
                                      disabled={deletingMatchId === match.id}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Cancel Match Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Cancel Match</h2>
            {(() => {
              const match = recentMatches.find(m => m.id === showDeleteConfirm);
              const hasConfirmed = match?.slots?.some(slot => 
                slot.applications?.some(app => app.status?.toLowerCase() === 'confirmed')
              ) || false;
              return hasConfirmed && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                  <p className="text-sm font-medium">Warning: This match has confirmed participants.</p>
                  <p className="text-sm mt-1">Cancelling may result in ELO penalties (1 free cancellation per 3 months).</p>
                </div>
              );
            })()}
            <p className="text-gray-700 mb-6">
              Are you sure you want to cancel this match? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={() => handleDeleteMatch(showDeleteConfirm)}
                isLoading={deletingMatchId === showDeleteConfirm}
                disabled={deletingMatchId === showDeleteConfirm}
                className="flex-1 w-full sm:w-auto"
              >
                Cancel Match
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingMatchId === showDeleteConfirm}
                className="flex-1 w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Withdraw from Match</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to withdraw from this match? This will free up the slot for other players.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => handleWithdrawFromMatch(showWithdrawConfirm)}
                isLoading={withdrawingApplicationId === showWithdrawConfirm}
                disabled={withdrawingApplicationId === showWithdrawConfirm}
                className="flex-1 w-full sm:w-auto"
              >
                Withdraw
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWithdrawConfirm(null)}
                disabled={withdrawingApplicationId === showWithdrawConfirm}
                className="flex-1 w-full sm:w-auto"
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

