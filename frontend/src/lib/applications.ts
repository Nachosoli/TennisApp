import { apiClient } from './api';
import { Application } from '@/types';

export const applicationsApi = {
  async applyToSlot(data: {
    matchSlotId: string;
    guestPartnerName?: string;
  }): Promise<Application> {
    const response = await apiClient.post<Application>('/applications', data);
    return response.data;
  },

  async confirm(id: string): Promise<Application> {
    const response = await apiClient.put<Application>(`/applications/${id}/confirm`);
    return response.data;
  },

  async reject(id: string): Promise<Application> {
    const response = await apiClient.put<Application>(`/applications/${id}/reject`);
    return response.data;
  },

  async getMyApplications(): Promise<Application[]> {
    const response = await apiClient.get<Application[]>('/applications/my-applications');
    return response.data;
  },

  async getMatchApplications(matchId: string): Promise<Application[]> {
    const response = await apiClient.get<Application[]>(`/applications/match/${matchId}`);
    return response.data;
  },

  async withdraw(id: string): Promise<void> {
    await apiClient.delete(`/applications/${id}`);
  },

  async approveFromWaitlist(id: string): Promise<Application> {
    const response = await apiClient.put<Application>(`/applications/${id}/approve-from-waitlist`);
    return response.data;
  },
};
