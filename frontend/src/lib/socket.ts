import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Connect to /chat namespace for chat functionality
    this.socket = io(`${SOCKET_URL}/chat`, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Chat methods
  joinMatchRoom(matchId: string): void {
    if (this.socket) {
      this.socket.emit('join_match', { matchId });
    }
  }

  leaveMatchRoom(matchId: string): void {
    if (this.socket) {
      this.socket.emit('leave_match', { matchId });
    }
  }

  sendMessage(matchId: string, message: string): void {
    if (this.socket) {
      this.socket.emit('send_message', { matchId, message });
    }
  }

  onMessage(callback: (data: ChatMessage) => void): void {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  offMessage(callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off('new_message', callback);
    }
  }

  // Match updates
  onMatchUpdate(callback: (match: any) => void): void {
    if (this.socket) {
      this.socket.on('match_updated', callback);
    }
  }

  offMatchUpdate(callback?: (match: any) => void): void {
    if (this.socket) {
      this.socket.off('match_updated', callback);
    }
  }

  // Application updates
  onApplicationUpdate(callback: (application: any) => void): void {
    if (this.socket) {
      this.socket.on('application_updated', callback);
    }
  }

  offApplicationUpdate(callback?: (application: any) => void): void {
    if (this.socket) {
      this.socket.off('application_updated', callback);
    }
  }

  // Notifications
  onNotification(callback: (notification: any) => void): void {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  offNotification(callback?: (notification: any) => void): void {
    if (this.socket) {
      this.socket.off('notification', callback);
    }
  }

  // Error handling
  onError(callback: (error: any) => void): void {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  offError(callback?: (error: any) => void): void {
    if (this.socket) {
      this.socket.off('error', callback);
    }
  }
}

export const socketService = new SocketService();
