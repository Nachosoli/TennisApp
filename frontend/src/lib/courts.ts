import { apiClient } from './api';
import { Court } from '@/types';

export const courtsApi = {
  async getAll(): Promise<Court[]> {
    const response = await apiClient.get<any[]>('/courts');
    // Backend returns surfaceType in lowercase, map to frontend surface field
    return response.data.map(court => ({
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
  },

  async getDropdown(): Promise<Court[]> {
    const response = await apiClient.get<Court[]>('/courts/dropdown');
    return response.data;
  },

  async getById(id: string): Promise<Court> {
    const response = await apiClient.get<any>(`/courts/${id}`);
    // Backend returns surfaceType in lowercase, map to frontend surface field
    return {
      ...response.data,
      surface: (response.data.surfaceType || 'hard').toLowerCase() as 'hard' | 'clay' | 'grass' | 'indoor',
      location: response.data.coordinates ? {
        type: 'Point' as const,
        coordinates: response.data.coordinates.coordinates || [0, 0],
      } : {
        type: 'Point' as const,
        coordinates: [0, 0],
      },
    };
  },

  async getNearby(lat: number, lng: number, radiusKm: number = 10): Promise<Court[]> {
    const response = await apiClient.get<Court[]>('/courts/nearby', {
      params: { lat, lng, radius: radiusKm },
    });
    return response.data;
  },

  async create(data: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    surface: 'hard' | 'clay' | 'grass' | 'indoor';
    isPublic: boolean;
  }): Promise<Court> {
    // Map frontend 'surface' to backend 'surfaceType' and 'lat/lng' to 'latitude/longitude'
    // Backend now expects lowercase values
    const requestData = {
      name: data.name,
      address: data.address,
      surfaceType: data.surface, // Already lowercase
      isPublic: data.isPublic,
      ...(data.lat !== undefined && { latitude: data.lat }),
      ...(data.lng !== undefined && { longitude: data.lng }),
    };
    const response = await apiClient.post<Court>('/courts', requestData);
    return response.data;
  },

  async update(id: string, data: Partial<Court>): Promise<Court> {
    const response = await apiClient.put<Court>(`/courts/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/courts/${id}`);
  },

  async createFromGooglePlace(data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string;
  }): Promise<Court> {
    const response = await apiClient.post<Court>('/courts/from-google-place', data);
    return response.data;
  },

  async searchByName(name: string): Promise<Court[]> {
    try {
      const response = await apiClient.get<Court[]>('/courts/search', {
        params: { name },
      });
      return response.data || [];
    } catch (error: any) {
      // Return empty array on any error
      return [];
    }
  },
};
