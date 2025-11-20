import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { PageLoader } from '@/components/ui/PageLoader';

export const useRequireAuth = () => {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      // If we already have a user and are authenticated, we're good
      if (isAuthenticated && user) {
        setIsChecking(false);
        return;
      }

      // Try to check auth state
      await checkAuth();
      
      // Check again after checkAuth completes
      const { user: checkedUser, isAuthenticated: checkedAuth } = useAuthStore.getState();
      
      if (!checkedAuth || !checkedUser) {
        // Not authenticated, redirect to login
        router.push('/auth/login');
        return;
      }
      
      setIsChecking(false);
    };

    verifyAuth();
  }, [isAuthenticated, user, router, checkAuth]);

  if (isChecking || isLoading) {
    return { isLoading: true, user: null };
  }

  if (!isAuthenticated || !user) {
    return { isLoading: false, user: null };
  }

  return { isLoading: false, user };
};


