import { create } from 'zustand';
import { Court } from '@/types';
import { courtsApi } from '@/lib/courts';

type CreateCourtData = {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  surface: 'HARD' | 'CLAY' | 'GRASS' | 'INDOOR';
  isPublic: boolean;
};

interface CourtsState {
  courts: Court[];
  selectedCourt: Court | null;
  dropdownCourts: Court[];
  isLoading: boolean;
  error: string | null;
  fetchCourts: () => Promise<void>;
  fetchCourtById: (id: string) => Promise<void>;
  fetchDropdownCourts: () => Promise<void>;
  fetchNearbyCourts: (lat: number, lng: number, radius?: number) => Promise<void>;
  createCourt: (data: CreateCourtData) => Promise<Court>;
  updateCourt: (id: string, data: Partial<CreateCourtData>) => Promise<void>;
  deleteCourt: (id: string) => Promise<void>;
  setSelectedCourt: (court: Court | null) => void;
  clearError: () => void;
}

export const useCourtsStore = create<CourtsState>((set) => ({
  courts: [],
  selectedCourt: null,
  dropdownCourts: [],
  isLoading: false,
  error: null,

  fetchCourts: async () => {
    set({ isLoading: true, error: null });
    try {
      const courts = await courtsApi.getAll();
      set({ courts, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch courts',
        isLoading: false,
      });
    }
  },

  fetchCourtById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const court = await courtsApi.getById(id);
      set({ selectedCourt: court, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch court',
        isLoading: false,
      });
    }
  },

  fetchDropdownCourts: async () => {
    set({ isLoading: true, error: null });
    try {
      const courts = await courtsApi.getDropdown();
      set({ dropdownCourts: courts, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch courts',
        isLoading: false,
      });
    }
  },

  fetchNearbyCourts: async (lat: number, lng: number, radius = 10) => {
    set({ isLoading: true, error: null });
    try {
      const courts = await courtsApi.getNearby(lat, lng, radius);
      set({ courts, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch nearby courts',
        isLoading: false,
      });
    }
  },

  createCourt: async (data: CreateCourtData) => {
    set({ isLoading: true, error: null });
    try {
      const court = await courtsApi.create(data);
      set((state) => ({
        courts: [court, ...state.courts],
        dropdownCourts: [court, ...state.dropdownCourts],
        isLoading: false,
      }));
      return court;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create court',
        isLoading: false,
      });
      throw error;
    }
  },

  updateCourt: async (id: string, data: Partial<CreateCourtData>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedCourt = await courtsApi.update(id, data);
      set((state) => ({
        courts: state.courts.map((c) => (c.id === id ? updatedCourt : c)),
        dropdownCourts: state.dropdownCourts.map((c) => (c.id === id ? updatedCourt : c)),
        selectedCourt: state.selectedCourt?.id === id ? updatedCourt : state.selectedCourt,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update court',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteCourt: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await courtsApi.delete(id);
      set((state) => ({
        courts: state.courts.filter((c) => c.id !== id),
        dropdownCourts: state.dropdownCourts.filter((c) => c.id !== id),
        selectedCourt: state.selectedCourt?.id === id ? null : state.selectedCourt,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete court',
        isLoading: false,
      });
      throw error;
    }
  },

  setSelectedCourt: (court: Court | null) => {
    set({ selectedCourt: court });
  },

  clearError: () => {
    set({ error: null });
  },
}));

