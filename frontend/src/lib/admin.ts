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
  async getAllCourts(page: number = 1, limit: number = 50, search?: string) {
    const response = await apiClient.get<{ courts: any[]; total: number }>('/admin/courts', {
      params: { page, limit, ...(search && { search }) },
    });
    // Transform backend format to frontend format
    const transformedCourts: Court[] = response.data.courts.map((court: any) => ({
      ...court,
      surface: (court.surfaceType || 'hard').toLowerCase() as 'hard' | 'clay' | 'grass' | 'indoor',
      location: court.coordinates ? {
        type: 'Point' as const,
        coordinates: court.coordinates.coordinates || [0, 0],
      } : {
        type: 'Point' as const,
        coordinates: [0, 0],
      },
    }));
    return { courts: transformedCourts, total: response.data.total };
  },

  async editCourt(courtId: string, data: Partial<Court>) {
    // Transform surface to surfaceType if needed
    const updateData: any = { ...data };
    if (updateData.surface && !updateData.surfaceType) {
      updateData.surfaceType = updateData.surface;
      delete updateData.surface;
    }
    // Remove location field if present (backend doesn't accept it directly)
    if (updateData.location) {
      delete updateData.location;
    }
    const response = await apiClient.put<Court>(`/admin/courts/${courtId}`, updateData);
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

  async getAllMatches(
    page: number = 1,
    limit: number = 50,
    search?: string,
    status?: string,
  ) {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (status) params.status = status;
    
    const response = await apiClient.get<{ matches: Match[]; total: number }>('/admin/matches', {
      params,
    });
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

  // Migrations
  async runNotificationRefactoringMigration() {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/admin/migrations/run-notification-refactoring'
    );
    return response.data;
  },

  async runMatchApplicantMigration() {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/admin/migrations/run-match-applicant'
    );
    return response.data;
  },

  // Database Wipe
  async wipeDatabaseExceptCourts(password: string) {
    const response = await apiClient.post<{ success: boolean; message: string; deletedCounts?: Record<string, number> }>(
      '/admin/wipe-database-except-courts',
      { password }
    );
    return response.data;
  },
};

