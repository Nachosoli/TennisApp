import { create } from 'zustand';
import { socketService } from '@/lib/socket';

interface SocketState {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  setConnected: (connected: boolean) => set({ isConnected: connected }),
}));
