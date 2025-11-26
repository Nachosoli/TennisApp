import { apiClient } from './api';
import { User, Court, Match, Report } from '@/types';

export const adminApi = {
  // User Management
  async getAllUsers(
    page: number = 1,
    limit: number = 50,
    search?: string,
    role?: string,
    isActive?: boolean,
  ) {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (role) params.role = role;
    if (isActive !== undefined) params.isActive = isActive.toString();
    
    const response = await apiClient.get<{ users: User[]; total: number }>('/admin/users', {
      params,
    });
    return response.data;
  },

  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get<User>(`/admin/users/${id}`);
    return response.data;
  },

  async suspendUser(userId: string, data: { suspendedUntil?: string; reason: string }) {
    const response = await apiClient.post<User>(`/admin/users/${userId}/suspend`, data);
    return response.data;
  },

  async banUser(userId: string, reason: string) {
    const response = await apiClient.post<User>(`/admin/users/${userId}/ban`, { reason });
    return response.data;
  },

  async editUser(userId: string, data: Partial<User>) {
    const response = await apiClient.put<User>(`/admin/users/${userId}`, data);
    return response.data;
  },

  async deleteUser(userId: string, reason: string) {
    await apiClient.delete(`/admin/users/${userId}`, { data: { reason } });
  },

  // Court Management
  async getAllCourts(page: number = 1, limit: number = 50) {
    const response = await apiClient.get<{ courts: Court[]; total: number }>('/admin/courts', {
      params: { page, limit },
    });
    return response.data;
  },

  async editCourt(courtId: string, data: Partial<Court>) {
    const response = await apiClient.put<Court>(`/admin/courts/${courtId}`, data);
    return response.data;
  },

  async deleteCourt(courtId: string, reason: string) {
    await apiClient.delete(`/admin/courts/${courtId}`, { data: { reason } });
  },

  // Dispute Resolution
  async resolveDispute(resultId: string, resolution: string) {
    const response = await apiClient.patch(`/admin/results/${resultId}/resolve-dispute`, { resolution });
    return response.data;
  },

  async overrideConfirmation(matchId: string, reason: string) {
    const response = await apiClient.post<Match>(`/admin/matches/${matchId}/override-confirmation`, { reason });
    return response.data;
  },

  async forceCancelMatch(matchId: string, reason: string) {
    const response = await apiClient.post<Match>(`/admin/matches/${matchId}/force-cancel`, { reason });
    return response.data;
  },

  async adjustScore(resultId: string, score: string, reason: string) {
    const response = await apiClient.patch(`/admin/results/${resultId}/adjust-score`, { score, reason });
    return response.data;
  },

  // Reports
  async getAllReports(status?: string) {
    const response = await apiClient.get<Report[]>('/reports', {
      params: status ? { status } : {},
    });
    return { reports: response.data, total: response.data.length };
  },

  async getReportById(id: string): Promise<Report> {
    const response = await apiClient.get<Report>(`/reports/${id}`);
    return response.data;
  },

  async resolveReport(reportId: string, resolution: string) {
    const response = await apiClient.patch<Report>(`/reports/${reportId}/status`, { 
      status: 'resolved' 
    });
    return response.data;
  },

  async dismissReport(reportId: string) {
    const response = await apiClient.patch<Report>(`/reports/${reportId}/status`, { 
      status: 'dismissed' 
    });
    return response.data;
  },

  // Analytics
  async getAnalytics() {
    const response = await apiClient.get('/analytics/dashboard');
    return response.data;
  },

  // Admin Actions
  async getAdminActions(limit: number = 100) {
    const response = await apiClient.get('/admin/actions', { params: { limit } });
    return response.data;
  },

  // User Management - Additional Methods
  async setUserHomeCourt(userId: string, courtId: string): Promise<User> {
    const response = await apiClient.post<User>(`/admin/users/${userId}/home-court`, { courtId });
    return response.data;
  },

  async getUserMatches(userId: string): Promise<Match[]> {
    const response = await apiClient.get<Match[]>(`/admin/users/${userId}/matches`);
    return response.data;
  },

  async getUserStats(userId: string) {
    const response = await apiClient.get(`/admin/users/${userId}/stats`);
    return response.data;
  },
};

