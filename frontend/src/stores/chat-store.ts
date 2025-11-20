import { create } from 'zustand';
import { socketService } from '@/lib/socket';
import { ChatMessage } from '@/types';

interface ChatState {
  messages: Record<string, ChatMessage[]>; // matchId -> messages
  isConnected: boolean;
  isLoading: boolean;
  currentRoom: string | null;
  setMessages: (matchId: string, messages: ChatMessage[]) => void;
  addMessage: (matchId: string, message: ChatMessage) => void;
  joinRoom: (matchId: string) => void;
  leaveRoom: (matchId: string) => void;
  sendMessage: (matchId: string, message: string) => Promise<void>;
  fetchMessages: (matchId: string) => Promise<void>;
  setupSocketListeners: (matchId: string) => void;
  cleanupSocketListeners: () => void;
  connect: (token?: string) => void;
  disconnect: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  isConnected: false,
  isLoading: false,
  currentRoom: null,

  setMessages: (matchId: string, messages: ChatMessage[]) => {
    set((state) => ({
      messages: { ...state.messages, [matchId]: messages },
    }));
  },

  addMessage: (matchId: string, message: ChatMessage) => {
    set((state) => {
      const existingMessages = state.messages[matchId] || [];
      return {
        messages: {
          ...state.messages,
          [matchId]: [...existingMessages, message],
        },
      };
    });
  },

  joinRoom: (matchId: string) => {
    const { currentRoom } = get();
    if (currentRoom === matchId) return;

    // Leave previous room
    if (currentRoom) {
      socketService.leaveMatchRoom(currentRoom);
    }

    socketService.joinMatchRoom(matchId);
    set({ currentRoom: matchId });

    // Set up message listener
    // Note: Since we're in a specific room, messages received are for this room
    socketService.onMessage((data) => {
      // Create a ChatMessage from the socket data
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        matchId: matchId, // Use the current room's matchId
        userId: data.userId,
        message: data.message,
        createdAt: data.createdAt,
      };
      get().addMessage(matchId, chatMessage);
    });
  },

  leaveRoom: (matchId: string) => {
    socketService.leaveMatchRoom(matchId);
    if (get().currentRoom === matchId) {
      set({ currentRoom: null });
    }
  },

  sendMessage: async (matchId: string, message: string) => {
    socketService.sendMessage(matchId, message);
    // Message will be added via socket listener
  },

  fetchMessages: async (matchId: string) => {
    set({ isLoading: true });
    try {
      const { chatApi } = await import('@/lib/chat');
      const messages = await chatApi.getMatchMessages(matchId);
      set((state) => ({
        messages: { ...state.messages, [matchId]: messages },
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set({ isLoading: false });
    }
  },

  setupSocketListeners: (matchId: string) => {
    const { joinRoom } = get();
    joinRoom(matchId);

    // Set up message listener
    // Note: socketService.onMessage provides data without matchId, but we're in a specific room
    const handleMessage = (data: {
      userId: string;
      message: string;
      createdAt: string;
    }) => {
      // Since we're in a specific room, all messages are for this matchId
      get().addMessage(matchId, {
        id: Date.now().toString(),
        matchId: matchId,
        userId: data.userId,
        message: data.message,
        createdAt: data.createdAt,
      });
    };

    socketService.onMessage(handleMessage);
  },

  cleanupSocketListeners: () => {
    const { currentRoom, leaveRoom } = get();
    if (currentRoom) {
      leaveRoom(currentRoom);
    }
    // Note: We can't easily remove specific listeners, but leaving room should be enough
  },

  connect: (token?: string) => {
    const socket = socketService.connect(token);
    set({ isConnected: socketService.isSocketConnected() });

    // Set up reconnection handler
    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });
  },

  disconnect: () => {
    socketService.disconnect();
    set({ isConnected: false, currentRoom: null });
  },
}));
