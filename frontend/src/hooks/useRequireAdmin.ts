import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from './useRequireAuth';
import { useAuthStore } from '@/stores/auth-store';

export const useRequireAdmin = () => {
  const router = useRouter();
  const { isLoading, user } = useRequireAuth();
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user is admin
      const isAdmin = currentUser?.role === 'admin';
      
      if (!isAdmin) {
        // Not admin, redirect to dashboard
        router.push('/dashboard');
      }
    }
  }, [isLoading, user, currentUser, router]);

  // Return null if not admin (redirect is handled by useEffect)
  if (isLoading) {
    return { isLoading: true, user: null, isAdmin: false };
  }

  if (!user) {
    return { isLoading: false, user: null, isAdmin: false };
  }

  const isAdmin = currentUser?.role === 'admin';
  
  if (!isAdmin) {
    return { isLoading: false, user: null, isAdmin: false };
  }

  return { isLoading: false, user, isAdmin: true };
};


