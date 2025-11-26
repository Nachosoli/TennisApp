import { apiClient } from './api';
import { Result } from '@/types';

export const resultsApi = {
  async submitScore(matchId: string, data: {
    score: string;
    winnerId?: string; // Optional, backend will determine from score
  }): Promise<Result> {
    const response = await apiClient.post<Result>(`/results`, {
      matchId,
      score: data.score,
      // winnerId is determined by backend from score
    });
    return response.data;
  },

  async getMatchResult(matchId: string): Promise<Result | null> {
    try {
      const response = await apiClient.get<Result>(`/results/match/${matchId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async disputeResult(resultId: string, reason: string): Promise<void> {
    await apiClient.post(`/results/${resultId}/dispute`, { reason });
  },
};

