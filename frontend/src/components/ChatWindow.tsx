'use client';

import React, { useState, useEffect } from 'react';
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
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedMessages = await chatApi.getMatchMessages(matchId);
      // Messages are already sorted DESC (newest first) from backend
      setMessages(loadedMessages);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [matchId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    try {
      setIsSending(true);
      setError(null);
      await chatApi.sendMessage(matchId, message.trim());
      setMessage('');
      // Reload messages to show the new one
      await loadMessages();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col border-2 border-gray-300 rounded-lg bg-white shadow-lg">
      {/* Messages Board */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 min-h-[300px] max-h-[500px]">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            // Get sender name - use user relation if available, otherwise show "Unknown"
            const senderName = msg.user 
              ? `${msg.user.firstName} ${msg.user.lastName}`
              : 'Unknown User';
            
            return (
              <div
                key={msg.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                {/* Sender Name */}
                <p className="font-semibold text-gray-900 mb-2">
                  {senderName}
                </p>
                {/* Message Content */}
                <p className="text-gray-700 whitespace-pre-wrap mb-2">
                  {msg.message}
                </p>
                {/* Timestamp */}
                <p className="text-xs text-gray-500">
                  {format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="border-t-2 border-gray-200 p-4 bg-white">
        <div className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message your opponent"
            rows={3}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              variant="primary" 
              disabled={!message.trim() || isSending}
              isLoading={isSending}
            >
              Send Message
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
