import { create } from 'zustand';
import { Match } from '@/types';
import { matchesApi } from '@/lib/matches';

interface MatchesState {
  matches: Match[];
  currentMatch: Match | null;
  isLoading: boolean;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    skillLevel?: string;
    gender?: string;
    maxDistance?: number;
    surface?: string;
  };
  fetchMatches: () => Promise<void>;
  fetchCalendar: () => Promise<void>;
  fetchMatchById: (id: string) => Promise<void>;
  setFilters: (filters: Partial<MatchesState['filters']>) => void;
  clearFilters: () => void;
}

export const useMatchesStore = create<MatchesState>((set, get) => ({
  matches: [],
  currentMatch: null,
  isLoading: false,
  filters: {},

  fetchMatches: async () => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const matches = await matchesApi.getAll(filters);
      set({ matches, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCalendar: async () => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const matches = await matchesApi.getCalendar(filters);
      set({ matches, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchMatchById: async (id: string) => {
    set({ isLoading: true });
    try {
      const match = await matchesApi.getById(id);
      set({ currentMatch: match, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setFilters: (newFilters: Partial<MatchesState['filters']>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },
}));
