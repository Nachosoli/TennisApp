import { useEffect, useState, useRef } from 'react';
import { useSocket } from './useSocket';
import { ChatMessage } from '@/types';

interface UseMatchChatProps {
  matchId: string;
}

export const useMatchChat = ({ matchId }: UseMatchChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket.socket) return;

    socket.joinMatchRoom(matchId);

    const handleMessage = (data: ChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === data.id)) {
          return prev;
        }
        return [...prev, data];
      });
      scrollToBottom();
    };

    socket.onMessage(handleMessage);

    return () => {
      socket.offMessage(handleMessage);
      socket.leaveMatchRoom(matchId);
    };
  }, [matchId, socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (message: string) => {
    if (message.trim() && socket.socket) {
      socket.sendMessage(matchId, message);
    }
  };

  return {
    messages,
    sendMessage,
    isLoading,
    messagesEndRef,
  };
};
