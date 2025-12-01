import { apiClient } from './api';

export interface CourtReview {
  id: string;
  courtId: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewDto {
  rating: number;
  comment?: string;
}

export interface CourtReviewStats {
  average: number;
  count: number;
}

export const reviewsApi = {
  async getReviewsByCourt(courtId: string): Promise<CourtReview[]> {
    const response = await apiClient.get<CourtReview[]>(`/courts/${courtId}/reviews`);
    return response.data;
  },

  async getUserReview(courtId: string): Promise<CourtReview | null> {
    try {
      const response = await apiClient.get<CourtReview>(`/courts/${courtId}/reviews/my-review`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createReview(courtId: string, data: CreateReviewDto): Promise<CourtReview> {
    const response = await apiClient.post<CourtReview>(`/courts/${courtId}/reviews`, data);
    return response.data;
  },

  async deleteReview(courtId: string, reviewId: string): Promise<void> {
    await apiClient.delete(`/courts/${courtId}/reviews/${reviewId}`);
  },

  async getCourtStats(courtId: string): Promise<CourtReviewStats> {
    const response = await apiClient.get<CourtReviewStats>(`/courts/${courtId}/reviews/stats`);
    return response.data;
  },
};

