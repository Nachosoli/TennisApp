import { apiClient } from './api';
import { ChatMessage } from '@/types';

export const chatApi = {
  async getMatchMessages(matchId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get<ChatMessage[]>(`/chat/match/${matchId}`);
    return response.data;
  },

  async sendMessage(matchId: string, message: string): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>('/chat', {
      matchId,
      message,
    });
    return response.data;
  },
};
