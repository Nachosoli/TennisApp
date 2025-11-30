'use client';

import { useEffect, useState, useRef } from 'react';
import { chatApi } from '@/lib/chat';
import { ChatMessage } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { socketService } from '@/lib/socket';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { format } from 'date-fns';
import { sanitizeText } from '@/lib/sanitize';

interface ChatProps {
  matchId: string;
}

export const Chat = ({ matchId }: ChatProps) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load initial messages
    chatApi.getMatchMessages(matchId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setIsLoading(false));

    // Subscribe to real-time messages via socket
    socketService.joinMatchRoom(matchId);
    
    const handleMessage = (data: any) => {
      if (data.matchId === matchId) {
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          matchId: data.matchId,
          userId: data.userId,
          message: data.message,
          createdAt: data.timestamp || new Date().toISOString(),
          userName: data.userName,
        };
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      }
    };

    socketService.onMessage(handleMessage);

    return () => {
      socketService.offMessage(handleMessage);
      socketService.leaveMatchRoom(matchId);
    };
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      // Send via Socket.IO for real-time
      socketService.sendMessage(matchId, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 border border-gray-200 rounded-lg bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.userId === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && message.user && (
                    <p className="text-xs font-medium mb-1 opacity-75">
                      {sanitizeText(message.user.firstName)} {sanitizeText(message.user.lastName)}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{sanitizeText(message.message)}</p>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {format(new Date(message.createdAt), 'h:mm a')}
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
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" variant="primary" disabled={!newMessage.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};
