'use client';

import { useState, useEffect, useRef } from 'react';
import { useMatchChat } from '@/hooks/useMatchChat';
import { useAuthStore } from '@/stores/auth-store';
import { chatApi } from '@/lib/chat';
import { ChatMessage } from '@/types';
import { format } from 'date-fns';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface ChatWindowProps {
  matchId: string;
}

export const ChatWindow = ({ matchId }: ChatWindowProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const { sendMessage: sendSocketMessage, messagesEndRef } = useMatchChat({ matchId });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load initial messages
    chatApi.getMatchMessages(matchId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setIsLoading(false));

    // Listen for new messages via socket
    const handleNewMessage = (newMessage: ChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    };

    // This will be handled by useMatchChat hook
  }, [matchId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      // Send via socket for real-time
      sendSocketMessage(message);
      
      // Optimistically add message
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        matchId,
        userId: user?.id || '',
        message: message.trim(),
        createdAt: new Date().toISOString(),
        user: user || undefined,
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Loading chat..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 border border-gray-200 rounded-lg bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.userId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && msg.user && (
                    <p className="text-xs font-medium mb-1 opacity-75">
                      {msg.user.firstName} {msg.user.lastName}
                    </p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {format(new Date(msg.createdAt), 'h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit" variant="primary" disabled={!message.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};
