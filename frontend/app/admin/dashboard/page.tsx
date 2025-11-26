'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';

export default function AdminDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main admin page
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <PageLoader text="Redirecting to admin dashboard..." />
    </div>
  );
}

