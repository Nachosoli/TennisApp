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

  useEffect(() => {
    if (!user) {
      return;
    }

    loadStats();
  }, [user, router, matchType]);

  const loadStats = async () => {
    if (!user) return;
    
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
          <h1 className="text-3xl font-bold text-gray-900">My Statistics</h1>
          <Button variant="outline" onClick={() => router.push('/profile')}>
            Back to Profile
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Matches</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalMatches}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Wins</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalWins}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Losses</p>
              <p className="text-3xl font-bold text-red-600">{stats.totalLosses}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Win Rate</p>
              <p className="text-3xl font-bold text-blue-600">{winRate}%</p>
            </div>
          </Card>
        </div>

        {/* ELO Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Singles ELO">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current ELO</p>
                <p className="text-4xl font-bold text-gray-900">{stats.singlesElo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Win Streak</p>
                <p className="text-2xl font-semibold text-green-600">
                  {stats.winStreakSingles} {stats.winStreakSingles === 1 ? 'match' : 'matches'}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Doubles ELO">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current ELO</p>
                <p className="text-4xl font-bold text-gray-900">{stats.doublesElo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Win Streak</p>
                <p className="text-2xl font-semibold text-green-600">
                  {stats.winStreakDoubles} {stats.winStreakDoubles === 1 ? 'match' : 'matches'}
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

