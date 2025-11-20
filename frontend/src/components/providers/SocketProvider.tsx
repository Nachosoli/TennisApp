'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { socketService } from '@/lib/socket';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && accessToken && !socketService.isSocketConnected()) {
      socketService.connect(accessToken);
    }

    return () => {
      // Keep connection alive during navigation
      // Only disconnect on logout
    };
  }, [isAuthenticated, accessToken]);

  return <>{children}</>;
};
