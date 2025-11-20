import { useEffect, useState, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import { chatApi } from '@/lib/chat';
import { ChatMessage } from '@/types';

interface UseChatOptions {
  matchId: string;
  enabled?: boolean;
}

export const useChat = ({ matchId, enabled = true }: UseChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing messages
  useEffect(() => {
    if (!enabled) return;

    chatApi.getMatchMessages(matchId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [matchId, enabled]);

  // Set up real-time updates
  useEffect(() => {
    if (!enabled) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    setIsConnected(socket.connected);

    // Join match room
    socketService.joinMatchRoom(matchId);

    // Listen for new messages
    const handleMessage = (data: {
      userId: string;
      message: string;
      createdAt: string;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          matchId,
          userId: data.userId,
          message: data.message,
          createdAt: data.createdAt,
        },
      ]);
    };

    socketService.onMessage(handleMessage);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socketService.offMessage(handleMessage);
      socketService.leaveMatchRoom(matchId);
    };
  }, [matchId, enabled]);

  const sendMessage = useCallback(
    (message: string) => {
      if (message.trim()) {
        socketService.sendMessage(matchId, message);
      }
    },
    [matchId],
  );

  return {
    messages,
    sendMessage,
    isConnected,
    isLoading,
  };
};
