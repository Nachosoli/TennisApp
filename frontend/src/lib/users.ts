import { apiClient } from './api';
import { User } from '@/types';

export const usersApi = {
  async getMyProfile(): Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>('/users/me', data);
    return response.data;
  },

  async uploadPhoto(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await apiClient.post<User>('/users/me/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadPhotoBase64(base64String: string): Promise<User> {
    const response = await apiClient.post<User>('/users/me/photo/base64', {
      photo: base64String,
    });
    return response.data;
  },

  async getPublicProfile(userId: string): Promise<Partial<User>> {
    const response = await apiClient.get<Partial<User>>(`/users/${userId}`);
    return response.data;
  },
};

