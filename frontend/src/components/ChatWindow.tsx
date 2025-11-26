'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const { sendMessage: sendSocketMessage, messages: socketMessages, messagesEndRef } = useMatchChat({ matchId });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load initial messages (including auto-generated contact messages)
    chatApi.getMatchMessages(matchId)
      .then((messages) => {
        setInitialMessages(messages);
        // Scroll to bottom after loading messages to show latest (including contact info)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [matchId]);

  // Merge initial messages with socket messages
  const messages = React.useMemo(() => {
    const allMessages = [...initialMessages];
    socketMessages.forEach((socketMsg) => {
      if (!allMessages.some((m) => m.id === socketMsg.id)) {
        allMessages.push(socketMsg);
      }
    });
    // Sort by createdAt
    return allMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [initialMessages, socketMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      // Send via socket for real-time
      sendSocketMessage(message);
      
      // Clear input - message will appear via socket
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
    <div className="flex flex-col h-96 border-2 border-gray-300 rounded-lg bg-white shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg font-semibold flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
        </svg>
        Match Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
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
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow-md ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
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
      <form onSubmit={handleSend} className="border-t-2 border-gray-200 p-4 bg-gray-50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
          <Button type="submit" variant="primary" disabled={!message.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};
