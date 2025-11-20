import { apiClient } from './api';

export interface DashboardMetrics {
  userGrowth: {
    totalUsers: number;
    activeUsers: number;
    newUsersLast30Days: number;
    growthRate: number;
    monthlyGrowth: Array<{ month: string; count: number }>;
  };
  matchCompletion: {
    totalMatches: number;
    completedMatches: number;
    cancelledMatches: number;
    completionRate: number;
  };
  popularCourts: Array<{
    courtId: string;
    courtName: string;
    matchCount: number;
  }>;
  eloDistribution: {
    ranges: Array<{ range: string; count: number }>;
  };
  geographicDistribution: {
    locations: Array<{ city: string; state: string; userCount: number }>;
  };
  peakUsage: {
    hourly: Array<{ hour: number; matchCount: number }>;
    daily: Array<{ day: string; matchCount: number }>;
  };
}

export const analyticsApi = {
  async getDashboard(): Promise<DashboardMetrics> {
    const response = await apiClient.get<DashboardMetrics>('/analytics/dashboard');
    return response.data;
  },

  async getUserGrowth() {
    const response = await apiClient.get('/analytics/user-growth');
    return response.data;
  },

  async getMatchCompletion() {
    const response = await apiClient.get('/analytics/match-completion');
    return response.data;
  },

  async getPopularCourts() {
    const response = await apiClient.get('/analytics/popular-courts');
    return response.data;
  },

  async getEloDistribution() {
    const response = await apiClient.get('/analytics/elo-distribution');
    return response.data;
  },

  async getGeographicDistribution() {
    const response = await apiClient.get('/analytics/geographic-distribution');
    return response.data;
  },

  async getPeakUsage() {
    const response = await apiClient.get('/analytics/peak-usage');
    return response.data;
  },
};

