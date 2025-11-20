'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { chatApi } from '@/lib/chat';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { format } from 'date-fns';

interface ChatWindowProps {
  matchId: string;
}

export const ChatWindow = ({ matchId }: ChatWindowProps) => {
  const { messages, joinRoom, leaveRoom, sendMessage, connect, disconnect } = useChatStore();
  const { accessToken, isAuthenticated } = useAuthStore();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const matchMessages = messages[matchId] || [];

  useEffect(() => {
    // Load existing messages
    chatApi.getMatchMessages(matchId).then((messages) => {
      useChatStore.getState().setMessages(matchId, messages);
    }).catch(console.error);

    if (isAuthenticated && accessToken) {
      connect(accessToken);
      joinRoom(matchId);

      return () => {
        leaveRoom(matchId);
      };
    }
  }, [matchId, isAuthenticated, accessToken, connect, joinRoom, leaveRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [matchMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(matchId, inputMessage.trim());
      setInputMessage('');
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-gray-200 rounded-lg bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {matchMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          matchMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.userId === useAuthStore.getState().user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.userId === useAuthStore.getState().user?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {message.user?.firstName} {message.user?.lastName}
                </div>
                <div className="text-sm">{message.message}</div>
                <div className={`text-xs mt-1 ${
                  message.userId === useAuthStore.getState().user?.id
                    ? 'text-blue-100'
                    : 'text-gray-500'
                }`}>
                  {format(new Date(message.createdAt), 'h:mm a')}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button type="submit" variant="primary" disabled={!inputMessage.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

