import { apiClient } from './api';
import { Match, MatchSlot, CreateMatchDto } from '@/types';
import { courtsApi } from './courts';

export const matchesApi = {
  async getAll(filters?: {
    dateFrom?: string;
    dateTo?: string;
    skillLevel?: string;
    gender?: string;
    maxDistance?: number;
    surface?: string;
  }): Promise<Match[]> {
    const response = await apiClient.get<Match[]>('/matches', { params: filters, timeout: 30000 });
    return response.data;
  },

  async getCalendar(filters?: {
    dateFrom?: string;
    dateTo?: string;
    skillLevel?: string;
    gender?: string;
    maxDistance?: number;
    surface?: string;
  }): Promise<Match[]> {
    const response = await apiClient.get<Match[]>('/matches/calendar', { params: filters, timeout: 30000 });
    return response.data;
  },

  async getMyMatches(): Promise<Match[]> {
    const response = await apiClient.get<Match[]>('/matches/my-matches', { timeout: 30000 });
    return response.data;
  },

  async getById(id: string): Promise<Match> {
    const response = await apiClient.get<Match>(`/matches/${id}`);
    return response.data;
  },

  async create(data: CreateMatchDto): Promise<Match> {
    // Use longer timeout for match creation (60 seconds) as it involves creating slots and multiple DB operations
    const response = await apiClient.post<Match>('/matches', data, { timeout: 60000 });
    return response.data;
  },

  async update(id: string, data: Partial<CreateMatchDto>): Promise<Match> {
    const response = await apiClient.put<Match>(`/matches/${id}`, data);
    return response.data;
  },

  async cancel(id: string): Promise<void> {
    await apiClient.delete(`/matches/${id}`);
  },
};

// Re-export courtsApi for convenience
export { courtsApi };
