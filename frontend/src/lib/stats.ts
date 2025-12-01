import { apiClient } from './api';
import { UserStats } from '@/types';

export interface HeadToHead {
  user1Id: string;
  user2Id: string;
  matches: Array<{
    id: string;
    date: string;
    score: string;
    winnerId: string;
  }>;
  user1Wins: number;
  user2Wins: number;
}

export interface EloHistoryEntry {
  id: string;
  matchId: string;
  matchType: 'singles' | 'doubles';
  eloBefore: number;
  eloAfter: number;
  opponentUserId: string;
  createdAt: string;
}

export const statsApi = {
  async getUserStats(userId: string): Promise<UserStats> {
    const response = await apiClient.get<UserStats>(`/stats/users/${userId}`);
    return response.data;
  },

  async getHeadToHead(userId1: string, userId2: string): Promise<HeadToHead> {
    const response = await apiClient.get<HeadToHead>(`/stats/head-to-head/${userId1}/${userId2}`);
    return response.data;
  },

  async getEloHistory(userId: string, matchType?: 'singles' | 'doubles'): Promise<EloHistoryEntry[]> {
    const response = await apiClient.get<EloHistoryEntry[]>(`/stats/users/${userId}/elo-history`, {
      params: { matchType },
    });
    return response.data;
  },

  async getEloChangeForMatch(userId: string, matchId: string): Promise<number | null> {
    try {
      const response = await apiClient.get<{ eloChange: number | null }>(`/stats/users/${userId}/matches/${matchId}/elo-change`);
      return response.data.eloChange;
    } catch (error) {
      console.error('Failed to get ELO change for match:', error);
      return null;
    }
  },
};

