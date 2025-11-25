'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    // Get values directly from form inputs as fallback if state is empty
    const formData = new FormData(e.currentTarget);
    const formEmail = (formData.get('email') as string) || email || '';
    const formPassword = (formData.get('password') as string) || password || '';

    console.log('=== FORM SUBMITTED ===');
    console.log('Email from state:', email);
    console.log('Email from form:', formEmail);
    console.log('Password length from state:', password.length);
    console.log('Password length from form:', formPassword.length);

    const finalEmail = formEmail.trim();
    const finalPassword = formPassword;

    if (!finalEmail || !finalPassword) {
      setError('Please enter both email and password');
      return;
    }

    try {
      console.log('Calling login function...');
      await login(finalEmail, finalPassword);
      console.log('Login function completed');
      
      // Wait a moment for store to update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get user from store after login
      const { user, isAuthenticated } = useAuthStore.getState();
      console.log('Store state after login:', { user: !!user, isAuthenticated });
      
      if (isAuthenticated && user) {
        console.log('User authenticated, redirecting...');
        // Use window.location for more reliable redirect
        if (user.role === 'ADMIN' || user.role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
        return; // Exit early since we're redirecting
      } else {
        console.error('Login failed - user not authenticated');
        setError('Login failed. Please check your credentials and try again.');
      }
    } catch (err: any) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error:', err);
      console.error('Error message:', err?.message);
      console.error('Error response:', err?.response);
      console.error('Error status:', err?.response?.status);
      setError(err?.message || err?.response?.data?.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in to CourtMate</h2>
          <p className="mt-2 text-sm text-gray-700">
            Or{' '}
            <Link href="/auth/register" className="font-semibold text-blue-600 hover:text-blue-700">
              create a new account
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Input
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
            <div className="mt-2 text-right">
              <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                Forgot Password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}

