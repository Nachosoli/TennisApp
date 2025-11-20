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
  score: z.string().min(1, 'Score is required'),
  winnerId: z.string().min(1, 'Winner must be selected'),
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
    formState: { errors },
  } = useForm<ScoreFormData>({
    // @ts-expect-error - zodResolver type compatibility issue with react-hook-form
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
    // Add other participants from applications
  ];

  const onSubmit = async (data: ScoreFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await resultsApi.submitScore(matchId, data);
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score *
              </label>
              <Input
                {...register('score')}
                error={errors.score?.message}
                placeholder="e.g., 6-4 3-6 6-2"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter score in format: set1-set2 set3-set4 (e.g., 6-4 3-6 6-2)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Winner *
              </label>
              <select
                {...register('winnerId')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select winner</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
              {errors.winnerId && (
                <p className="mt-1 text-sm text-red-600">{errors.winnerId.message}</p>
              )}
            </div>

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
