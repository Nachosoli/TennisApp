'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function TestLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [status, setStatus] = useState<string>('Ready to test login');
  const [error, setError] = useState<string | null>(null);

  const handleTestLogin = async () => {
    try {
      setStatus('Attempting login...');
      setError(null);
      
      await login('ignacio.solinas@hotmail.com', 'Serenito23!');
      
      setStatus('Login successful! Redirecting to dashboard...');
      
      // Wait a moment for store to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check user role and redirect
      const { user } = useAuthStore.getState();
      if (user?.role === 'ADMIN' || user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setStatus('Login failed');
      setError(err?.response?.data?.message || err?.message || 'Unknown error');
      console.error('Test login error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Test Login</h1>
          <p className="text-gray-600 mb-4">Click the button below to test login with:</p>
          <p className="font-mono text-sm bg-gray-100 p-2 rounded mb-4">
            ignacio.solinas@hotmail.com / Serenito23!
          </p>
          
          <Button onClick={handleTestLogin} variant="primary" className="w-full mb-4">
            Test Login
          </Button>
          
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700">Status:</p>
            <p className="text-sm text-gray-600">{status}</p>
          </div>
          
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

