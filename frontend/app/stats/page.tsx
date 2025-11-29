'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { statsApi } from '@/lib/stats';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserStats } from '@/types';
import { EloHistoryEntry } from '@/lib/stats';

export default function StatsPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [eloHistory, setEloHistory] = useState<EloHistoryEntry[]>([]);
  const [matchType, setMatchType] = useState<'singles' | 'doubles' | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (!user) {
      return;
    }

    const loadStats = async () => {
      setIsLoading(true);
      try {
        const [userStats, history] = await Promise.all([
          statsApi.getUserStats(user.id),
          statsApi.getEloHistory(user.id, matchType),
        ]);
        setStats(userStats);
        setEloHistory(history);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [user, matchType]);

  // Conditional returns AFTER all hooks
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

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">No statistics available</p>
        </div>
      </Layout>
    );
  }

  const winRate = stats.totalMatches > 0 
    ? ((stats.totalWins / stats.totalMatches) * 100).toFixed(1)
    : '0.0';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Statistics</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Overview Cards - Compact 4-in-row layout */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-6">
          <Card className="bg-white p-1.5 sm:p-4">
            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <div className="bg-gray-100 rounded-lg p-1.5 sm:p-2.5">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-bold text-gray-900">{stats.totalMatches}</p>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Matches</p>
              </div>
            </div>
          </Card>
          <Card className="bg-white p-1.5 sm:p-4">
            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <div className="bg-green-100 rounded-lg p-1.5 sm:p-2.5">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-bold text-green-600">{stats.totalWins}</p>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Wins</p>
              </div>
            </div>
          </Card>
          <Card className="bg-white p-1.5 sm:p-4">
            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <div className="bg-red-100 rounded-lg p-1.5 sm:p-2.5">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-bold text-red-600">{stats.totalLosses ?? 0}</p>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Losses</p>
              </div>
            </div>
          </Card>
          <Card className="bg-white p-1.5 sm:p-4">
            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <div className="bg-blue-100 rounded-lg p-1.5 sm:p-2.5">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-bold text-blue-600">{winRate}%</p>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Win Rate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ELO Ratings - Compact 2-column layout */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-white p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-green-100 rounded-lg p-2 sm:p-2.5">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="flex-1 w-full">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Singles ELO</h3>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{stats.singlesElo}</p>
                <p className="text-xs sm:text-sm text-green-600">
                  {stats.winStreakSingles} {stats.winStreakSingles === 1 ? 'match' : 'matches'} streak
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-green-100 rounded-lg p-2 sm:p-2.5">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 w-full">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Doubles ELO</h3>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{stats.doublesElo}</p>
                <p className="text-xs sm:text-sm text-green-600">
                  {stats.winStreakDoubles} {stats.winStreakDoubles === 1 ? 'match' : 'matches'} streak
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ELO History */}
        <Card title="ELO History">
          <div className="mb-4 flex space-x-2">
            <Button
              variant={matchType === undefined ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setMatchType(undefined)}
            >
              All
            </Button>
            <Button
              variant={matchType === 'singles' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setMatchType('singles')}
            >
              Singles
            </Button>
            <Button
              variant={matchType === 'doubles' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setMatchType('doubles')}
            >
              Doubles
            </Button>
          </div>

          {eloHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No ELO history available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eloHistory.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.matchType === 'singles' ? 'Singles' : 'Doubles'} Match
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">{entry.eloBefore}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className={`font-semibold ${
                      entry.eloAfter > entry.eloBefore ? 'text-green-600' : 
                      entry.eloAfter < entry.eloBefore ? 'text-red-600' : 
                      'text-gray-900'
                    }`}>
                      {entry.eloAfter}
                    </span>
                    <span className={`text-xs ${
                      entry.eloAfter > entry.eloBefore ? 'text-green-600' : 
                      entry.eloAfter < entry.eloBefore ? 'text-red-600' : 
                      'text-gray-500'
                    }`}>
                      ({entry.eloAfter > entry.eloBefore ? '+' : ''}{entry.eloAfter - entry.eloBefore})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

