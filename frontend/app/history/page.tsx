'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { Layout } from '@/components/layout/Layout';
import { matchesApi } from '@/lib/matches';
import { statsApi, EloHistoryEntry } from '@/lib/stats';
import { Match, User } from '@/types';
import { parseLocalDate } from '@/lib/date-utils';
import { sanitizeText } from '@/lib/sanitize';

interface MatchHistoryEntry {
  match: Match;
  opponent: User | null;
  opponentName: string;
  score: string;
  eloChange: number | null;
  matchType: 'singles' | 'doubles';
}

export default function HistoryPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadMatchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all user matches
        const allMatches = await matchesApi.getMyMatches();
        
        // Filter for completed matches with results
        const completedMatches = allMatches.filter(match => {
          const hasResult = match.results && match.results.length > 0;
          return match.status?.toLowerCase() === 'completed' && hasResult;
        });

        // Fetch ELO history
        const eloHistory = await statsApi.getEloHistory(user.id);

        // Create a map of matchId -> ELO change
        const eloChangeMap = new Map<string, number>();
        eloHistory.forEach(entry => {
          const change = entry.eloAfter - entry.eloBefore;
          eloChangeMap.set(entry.matchId, change);
        });

        // Process matches into history entries
        const historyEntries: MatchHistoryEntry[] = completedMatches.map(match => {
          const isCreator = match.creatorUserId === user?.id;
          let opponent: User | null = null;
          let opponentName = 'Unknown';
          
          // Determine opponent
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
          const score = result?.score || '-';

          // Get ELO change
          const eloChange = eloChangeMap.get(match.id) ?? null;

          // Determine match type
          const matchType = match.format?.toLowerCase() === 'doubles' ? 'doubles' : 'singles';

          return {
            match,
            opponent,
            opponentName,
            score,
            eloChange,
            matchType,
          };
        });

        // Sort by date (most recent first)
        historyEntries.sort((a, b) => {
          const dateA = parseLocalDate(a.match.date);
          const dateB = parseLocalDate(b.match.date);
          return dateB.getTime() - dateA.getTime();
        });

        setMatches(historyEntries);
      } catch (err) {
        console.error('Failed to load match history:', err);
        setError('Failed to load match history. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMatchHistory();
  }, [user]);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user) {
    return null; // Redirect handled by useRequireAuth
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Match History</h1>
          <p className="mt-1 text-sm text-gray-600">Your completed tennis matches</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-800 hover:text-red-900 font-medium"
            >
              ×
            </button>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-2">No match history yet</p>
            <p className="text-sm text-gray-500">Completed matches with scores will appear here</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {matches.map((entry) => {
                const { match, opponentName, score, eloChange, matchType } = entry;
                const matchDate = parseLocalDate(match.date);
                const isHomeCourt = match.courtId === user?.homeCourtId;

                return (
                  <div
                    key={match.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {matchDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {sanitizeText(match.court?.name || 'Court')}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600">
                          {isHomeCourt && (
                            <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                          )}
                          <span>vs {sanitizeText(opponentName)}</span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Score: </span>
                            <span className="text-gray-900">{sanitizeText(score)}</span>
                          </div>
                          {eloChange !== null && (
                            <div>
                              <span className="font-medium text-gray-700">ELO: </span>
                              <span className={eloChange >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {eloChange > 0 ? '+' : ''}{eloChange} points
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
                    <th className="px-4 py-3 text-left text-sm font-medium">Opponent</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Facility</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">ELO</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches.map((entry) => {
                    const { match, opponentName, score, eloChange } = entry;
                    const matchDate = parseLocalDate(match.date);
                    const isHomeCourt = match.courtId === user?.homeCourtId;

                    return (
                      <tr
                        key={match.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/matches/${match.id}`)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {matchDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {sanitizeText(opponentName)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {sanitizeText(score)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center">
                            {isHomeCourt && (
                              <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                              </svg>
                            )}
                            {sanitizeText(match.court?.name || 'Court')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {eloChange !== null ? (
                            <span className={eloChange >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {eloChange > 0 ? '+' : ''}{eloChange}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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
    </Layout>
  );
}

