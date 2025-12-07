'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
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

// Helper function to check if a set score is valid according to tennis rules
const isValidSetScore = (playerGames: number, opponentGames: number): boolean => {
  // Both must be non-negative integers
  if (playerGames < 0 || opponentGames < 0 || !Number.isInteger(playerGames) || !Number.isInteger(opponentGames)) {
    return false;
  }

  // If both are 0, it's empty (valid for partial entry)
  if (playerGames === 0 && opponentGames === 0) {
    return true;
  }

  // A set must be won by at least 2 games
  const diff = Math.abs(playerGames - opponentGames);
  
  // If one player has 6 or more games, they must win by 2
  if (playerGames >= 6 || opponentGames >= 6) {
    // Check for tiebreak (7-6 or 6-7)
    if ((playerGames === 7 && opponentGames === 6) || (playerGames === 6 && opponentGames === 7)) {
      return true; // Valid tiebreak
    }
    // Otherwise, must win by 2 and winner must have at least 6
    if (diff >= 2 && Math.max(playerGames, opponentGames) >= 6) {
      // But can't have scores like 7-4, 8-5, etc. (must be 6-0 to 6-4, or 7-5, or 7-6)
      const winner = Math.max(playerGames, opponentGames);
      const loser = Math.min(playerGames, opponentGames);
      
      // Valid scores: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6
      if (winner === 6 && loser <= 4) {
        return true;
      }
      if (winner === 7 && (loser === 5 || loser === 6)) {
        return true;
      }
      // Invalid: 7-4, 8-6, etc.
      return false;
    }
    return false;
  }

  // If neither has 6, it's incomplete (valid for partial entry or retirement)
  return true;
};

// Helper function to check if a set is complete (won by either player)
const isSetComplete = (playerGames: number, opponentGames: number): boolean => {
  // If both are 0, it's empty (not complete)
  if (playerGames === 0 && opponentGames === 0) {
    return false;
  }

  // Check if one player has won the set
  const diff = Math.abs(playerGames - opponentGames);
  
  // If one player has 6+ games and leads by 2+, set is complete
  if ((playerGames >= 6 || opponentGames >= 6) && diff >= 2) {
    // Validate it's a valid winning score
    const winner = Math.max(playerGames, opponentGames);
    const loser = Math.min(playerGames, opponentGames);
    
    // Valid winning scores: 6-0 to 6-4, 7-5, 7-6
    if (winner === 6 && loser <= 4) {
      return true;
    }
    if (winner === 7 && (loser === 5 || loser === 6)) {
      return true;
    }
  }
  
  // Tiebreak (7-6 or 6-7) is complete
  if ((playerGames === 7 && opponentGames === 6) || (playerGames === 6 && opponentGames === 7)) {
    return true;
  }
  
  // Otherwise, set is incomplete
  return false;
};

const scoreSchema = z.object({
  set1Player: z.string().optional(),
  set1Opponent: z.string().optional(),
  set2Player: z.string().optional(),
  set2Opponent: z.string().optional(),
  set3Player: z.string().optional(),
  set3Opponent: z.string().optional(),
  wonByDefault: z.boolean().optional(),
  opponentRetired: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // At least one set must be filled OR alternative outcome must be selected
  const hasSetData = data.set1Player || data.set1Opponent || data.set2Player || data.set2Opponent || data.set3Player || data.set3Opponent;
  const hasAlternative = data.wonByDefault || data.opponentRetired;
  if (!hasSetData && !hasAlternative) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please enter at least one set score or select an alternative outcome',
    });
    return;
  }

  // Check for incomplete sets
  const sets = [
    { player: data.set1Player, opponent: data.set1Opponent },
    { player: data.set2Player, opponent: data.set2Opponent },
    { player: data.set3Player, opponent: data.set3Opponent },
  ];

  let hasIncompleteSet = false;
  for (const set of sets) {
    if (set.player || set.opponent) {
      const playerGames = parseInt(set.player || '0', 10);
      const opponentGames = parseInt(set.opponent || '0', 10);
      
      if (!isSetComplete(playerGames, opponentGames)) {
        hasIncompleteSet = true;
        break;
      }
    }
  }

  // If there are incomplete sets, require alternative outcome
  if (hasIncompleteSet && !data.wonByDefault && !data.opponentRetired) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Incomplete scores require selecting "Opponent retired" or "Won by default"',
    });
    return;
  }

  // Validate each complete set score
  for (const set of sets) {
    if (set.player || set.opponent) {
      const playerGames = parseInt(set.player || '0', 10);
      const opponentGames = parseInt(set.opponent || '0', 10);
      
      // Only validate complete sets (incomplete sets are handled above)
      if (isSetComplete(playerGames, opponentGames)) {
        if (!isValidSetScore(playerGames, opponentGames)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid set score. A set must be won by at least 2 games (e.g., 6-4, 7-5, or 7-6 for tiebreak). Scores like 6-5 are not valid.',
          });
          return;
        }
      }
    }
  }
});

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
    control,
    formState: { errors },
  } = useForm<ScoreFormData>({
    resolver: zodResolver(scoreSchema as any),
  });

  // Watch set values to determine if set 3 should be enabled
  const set1Player = useWatch({ control, name: 'set1Player' });
  const set1Opponent = useWatch({ control, name: 'set1Opponent' });
  const set2Player = useWatch({ control, name: 'set2Player' });
  const set2Opponent = useWatch({ control, name: 'set2Opponent' });
  const wonByDefault = useWatch({ control, name: 'wonByDefault' });
  const opponentRetired = useWatch({ control, name: 'opponentRetired' });

  // Determine if set 3 should be editable
  const isSet3Editable = (() => {
    // If alternative outcome is selected, disable set 3
    if (wonByDefault || opponentRetired) {
      return false;
    }

    // Parse set scores
    const set1PlayerGames = parseInt(set1Player || '0', 10);
    const set1OpponentGames = parseInt(set1Opponent || '0', 10);
    const set2PlayerGames = parseInt(set2Player || '0', 10);
    const set2OpponentGames = parseInt(set2Opponent || '0', 10);

    // Check if both sets are complete (won by either player)
    const set1Complete = isSetComplete(set1PlayerGames, set1OpponentGames);
    const set2Complete = isSetComplete(set2PlayerGames, set2OpponentGames);

    if (!set1Complete || !set2Complete) {
      // If sets are not complete, allow set 3 to be editable (user might be entering in order)
      return true;
    }

    // Determine set winners
    const set1PlayerWon = set1PlayerGames > set1OpponentGames;
    const set1OpponentWon = set1OpponentGames > set1PlayerGames;
    const set2PlayerWon = set2PlayerGames > set2OpponentGames;
    const set2OpponentWon = set2OpponentGames > set2PlayerGames;

    // If one player won both sets, disable set 3 (match is over)
    if ((set1PlayerWon && set2PlayerWon) || (set1OpponentWon && set2OpponentWon)) {
      return false;
    }

    // If sets are tied (1-1), enable set 3
    if ((set1PlayerWon && set2OpponentWon) || (set1OpponentWon && set2PlayerWon)) {
      return true;
    }

    // Default: allow editing (in case of incomplete data)
    return true;
  })();

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

  // Determine current user and opponent from the reporting user's perspective
  const currentUserParticipant = participants.find(p => p.id === user?.id);
  const opponentParticipant = participants.find(p => p.id !== user?.id);
  const currentUserName = currentUserParticipant?.name || 'You';
  const opponentName = opponentParticipant?.name || 'Opponent';
  
  // Determine if user is creator (player1) or applicant (player2)
  const isCreator = currentMatch.creatorUserId === user?.id;
  const player1Id = currentMatch.creatorUserId;
  const player2Id = opponentParticipant?.id || '';
  
  // Keep creator/opponent names for winner determination in confirmation popup
  const creator = participants.find(p => p.id === currentMatch.creatorUserId);
  const creatorName = creator?.name || 'Creator';

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
      return opponentParticipant?.id || null;
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
      
      const scorePart = sets.join(' ');
      
      if (data.wonByDefault) {
        scoreString = scorePart ? `${scorePart} Won by default` : 'Won by default';
      } else if (data.opponentRetired) {
        scoreString = scorePart ? `${scorePart} Opponent retired` : 'Opponent retired';
      } else {
        scoreString = scorePart;
      }

      // Show confirmation popup
      const winnerName = winnerId === user?.id 
        ? (isCreator ? creatorName : opponentName)
        : (isCreator ? opponentName : creatorName);
      const confirmationMessage = winnerId === user?.id
        ? `You are about to report that you won the match. Continue?`
        : `You are about to report that ${winnerName} won the match. Continue?`;
      
      if (!window.confirm(confirmationMessage)) {
        setIsLoading(false);
        return;
      }
      
      await resultsApi.submitScore(matchId, {
        score: scoreString,
      });
      // Redirect to dashboard after successful score submission
      router.push('/dashboard');
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

            {/* Player vs Opponent Display - From the reporting user's perspective */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {currentUserParticipant?.name?.[0] || 'Y'}
                </div>
                <span className="font-medium text-gray-900">
                  You
                </span>
              </div>
              <span className="text-gray-500 text-lg">vs.</span>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold">
                  {opponentParticipant?.name?.[0] || 'O'}
                </div>
                <span className="font-medium text-gray-900">
                  {opponentName}
                </span>
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
            {[1, 2, 3].map((setNum) => {
              const isDisabled = setNum === 3 && !isSet3Editable;
              
              return (
                <div key={setNum} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    SET {setNum}
                    {isDisabled && (
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        (Not needed - match already decided)
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      {...register(`set${setNum}Player` as any)}
                      placeholder="0"
                      className="w-20"
                      disabled={isDisabled}
                    />
                    <span className="text-gray-500">-</span>
                    <Input
                      {...register(`set${setNum}Opponent` as any)}
                      placeholder="0"
                      className="w-20"
                      disabled={isDisabled}
                    />
                  </div>
                </div>
              );
            })}

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

            {/* Validation errors */}
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
