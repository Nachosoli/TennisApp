'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Component to sync auth state from localStorage on app initialization
 * This helps prevent random logouts by ensuring zustand persist is synced
 */
export function AuthSync({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Sync auth state on mount
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}

