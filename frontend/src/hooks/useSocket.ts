import { useEffect, useRef } from 'react';
import { socketService } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef<ReturnType<typeof socketService.getSocket>>(null);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      socketRef.current = socketService.connect(accessToken);
    }

    return () => {
      if (socketRef.current) {
        socketService.disconnect();
      }
    };
  }, [isAuthenticated, accessToken]);

  return {
    socket: socketRef.current,
    isConnected: socketService.isSocketConnected(),
    joinMatchRoom: socketService.joinMatchRoom.bind(socketService),
    leaveMatchRoom: socketService.leaveMatchRoom.bind(socketService),
    sendMessage: socketService.sendMessage.bind(socketService),
    onMessage: socketService.onMessage.bind(socketService),
    offMessage: socketService.offMessage.bind(socketService),
    onMatchUpdate: socketService.onMatchUpdate.bind(socketService),
    offMatchUpdate: socketService.offMatchUpdate.bind(socketService),
    onApplicationUpdate: socketService.onApplicationUpdate.bind(socketService),
    offApplicationUpdate: socketService.offApplicationUpdate.bind(socketService),
    onNotification: socketService.onNotification.bind(socketService),
    offNotification: socketService.offNotification.bind(socketService),
  };
};
