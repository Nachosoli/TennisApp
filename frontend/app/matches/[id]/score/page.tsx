'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMatchesStore } from '@/stores/matches-store';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { resultsApi } from '@/lib/results';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getErrorMessage } from '@/lib/errors';

const scoreSchema = z.object({
  set1Player: z.string().optional(),
  set1Opponent: z.string().optional(),
  set2Player: z.string().optional(),
  set2Opponent: z.string().optional(),
  set3Player: z.string().optional(),
  set3Opponent: z.string().optional(),
  wonByDefault: z.boolean().optional(),
  opponentRetired: z.boolean().optional(),
}).refine((data) => {
  // At least one set must be filled OR alternative outcome must be selected
  const hasSetData = data.set1Player || data.set1Opponent || data.set2Player || data.set2Opponent || data.set3Player || data.set3Opponent;
  const hasAlternative = data.wonByDefault || data.opponentRetired;
  return hasSetData || hasAlternative;
}, { message: 'Please enter at least one set score or select an alternative outcome' });

type ScoreFormData = z.infer<typeof scoreSchema>;

function ScoreEntryPageContent() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const { currentMatch, fetchMatchById } = useMatchesStore();
  const { isLoading: authLoading, user } = useRequireAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScoreFormData>({
    resolver: zodResolver(scoreSchema),
  });

  useEffect(() => {
    if (matchId && user) {
      fetchMatchById(matchId);
    }
  }, [matchId, fetchMatchById, user]);

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

  if (!currentMatch) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading match...</p>
        </div>
      </Layout>
    );
  }

  const participants = [
    { id: currentMatch.creatorUserId, name: `${currentMatch.creator?.firstName} ${currentMatch.creator?.lastName}` },
  ];

  // Find confirmed applicant from match slots
  const confirmedSlot = currentMatch.slots?.find(slot =>
    slot.status?.toLowerCase() === 'confirmed' ||
    slot.applications?.some(app => app.status?.toLowerCase() === 'confirmed')
  );

  if (confirmedSlot?.applications) {
    const confirmedApplication = confirmedSlot.applications.find(
      app => app.status?.toLowerCase() === 'confirmed'
    );
    if (confirmedApplication?.applicant) {
      participants.push({
        id: confirmedApplication.applicant.id || confirmedApplication.applicantUserId || '',
        name: `${confirmedApplication.applicant.firstName} ${confirmedApplication.applicant.lastName}`
      });
    }
  }

  // Determine opponent name for display
  const opponent = participants.find(p => p.id !== user?.id);
  const opponentName = opponent?.name || 'Opponent';
  
  // Determine if user is creator (player1) or applicant (player2)
  const isCreator = currentMatch.creatorUserId === user?.id;
  const player1Id = currentMatch.creatorUserId;
  const player2Id = opponent?.id || '';

  // Determine winner from scores (for confirmation popup)
  const determineWinner = (data: ScoreFormData): string | null => {
    if (data.wonByDefault || data.opponentRetired) {
      // If won by default or opponent retired, YOU win
      return user?.id || null;
    }

    // Count sets won by YOU and opponent
    let youSets = 0;
    let opponentSets = 0;

    const sets = [
      { you: data.set1Player, opponent: data.set1Opponent },
      { you: data.set2Player, opponent: data.set2Opponent },
      { you: data.set3Player, opponent: data.set3Opponent },
    ];

    for (const set of sets) {
      const youGames = parseInt(set.you || '0', 10);
      const opponentGames = parseInt(set.opponent || '0', 10);
      
      // Only count sets that have been played (at least one game > 0)
      if (youGames > 0 || opponentGames > 0) {
        if (youGames > opponentGames) {
          youSets++;
        } else if (opponentGames > youGames) {
          opponentSets++;
        }
        // If tied, neither wins the set
      }
    }

    // Winner is whoever wins 2+ sets
    if (youSets >= 2) {
      return user?.id || null;
    } else if (opponentSets >= 2) {
      return opponent?.id || null;
    }

    // If we can't determine a clear winner (e.g., incomplete match), return null
    // Backend will handle validation
    return null;
  };

  const onSubmit = async (data: ScoreFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Determine winner from scores
      const winnerId = determineWinner(data);
      if (!winnerId) {
        setError('Unable to determine winner from scores. Please check your input.');
        setIsLoading(false);
        return;
      }

      // Format score string from sets or handle alternative outcomes
      // Backend expects format: "player1Games-player2Games" where player1 is creator
      let scoreString = '';
      if (data.wonByDefault) {
        scoreString = 'Won by default';
      } else if (data.opponentRetired) {
        scoreString = 'Opponent retired';
      } else {
        // Build score string from sets
        // If user is creator, scores are already in correct format (YOU = player1)
        // If user is applicant, we need to swap (YOU = player2, so swap to player1-player2)
        const sets: string[] = [];
        const setData = [
          { you: data.set1Player, opponent: data.set1Opponent },
          { you: data.set2Player, opponent: data.set2Opponent },
          { you: data.set3Player, opponent: data.set3Opponent },
        ];
        
        for (const set of setData) {
          if (set.you || set.opponent) {
            const youGames = set.you || '0';
            const opponentGames = set.opponent || '0';
            
            if (isCreator) {
              // Creator reporting: YOU = player1, opponent = player2
              sets.push(`${youGames}-${opponentGames}`);
            } else {
              // Applicant reporting: YOU = player2, opponent = player1, so swap
              sets.push(`${opponentGames}-${youGames}`);
            }
          }
        }
        scoreString = sets.join(' ');
      }

      // Show confirmation popup
      const winnerName = winnerId === user?.id ? 'You' : opponentName;
      const confirmationMessage = winnerId === user?.id
        ? `You are about to report that you won the match vs ${opponentName}. Continue?`
        : `You are about to report that ${opponentName} won the match. Continue?`;
      
      if (!window.confirm(confirmationMessage)) {
        setIsLoading(false);
        return;
      }
      
      await resultsApi.submitScore(matchId, {
        score: scoreString,
      });
      router.push(`/matches/${matchId}`);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Submit Score</h1>

        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Match Details</h2>
            <p className="text-gray-600">{currentMatch.court?.name}</p>
            <p className="text-sm text-gray-500">
              {new Date(currentMatch.date).toLocaleDateString()}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Player vs Opponent Display */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <span className="font-medium text-gray-900">You</span>
              </div>
              <span className="text-gray-500 text-lg">vs.</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-medium">{opponentName}</span>
              </div>
            </div>

            {/* Instructional Text */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Scores should be reported from the perspective of the person reporting.</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Example win: 6-4, 6-4.</li>
                <li>Example loss: 4-6, 3-6.</li>
                <li>Tie break sets are reported 7-6 or 6-7.</li>
              </ul>
            </div>

            {/* SET Sections */}
            {[1, 2, 3].map((setNum) => (
              <div key={setNum} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  SET {setNum}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    {...register(`set${setNum}Player` as any)}
                    placeholder="0"
                    className="w-20"
                  />
                  <span className="text-gray-500">-</span>
                  <Input
                    {...register(`set${setNum}Opponent` as any)}
                    placeholder="0"
                    className="w-20"
                  />
                </div>
              </div>
            ))}

            {/* Alternative Outcomes */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('wonByDefault')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">I won the match by default</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('opponentRetired')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">the match was not completed - my opponent retired</span>
              </label>
            </div>

            {/* Winner will be determined automatically from scores */}
            {(errors as any).root && (
              <p className="mt-1 text-sm text-red-600">{(errors as any).root.message}</p>
            )}

            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={isLoading}
              >
                Submit Score
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}

export default function ScoreEntryPage() {
  return (
    <ErrorBoundary>
      <ScoreEntryPageContent />
    </ErrorBoundary>
  );
}
