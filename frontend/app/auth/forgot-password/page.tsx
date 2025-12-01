'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/errors';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h2>
            <p className="mt-2 text-sm text-gray-700">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                <p className="font-semibold">Email Sent!</p>
                <p className="text-sm mt-1">
                  If an account exists with that email, you will receive a password reset link shortly.
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  variant="primary"
                  onClick={() => router.push('/auth/login')}
                  className="w-full"
                >
                  Back to Login
                </Button>
                <Link href="/auth/login" className="block text-center text-sm text-blue-600 hover:text-blue-700">
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Send Reset Link
              </Button>

              <div className="text-center">
                <Link href="/auth/login" className="text-sm text-blue-600 hover:text-blue-700">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </ErrorBoundary>
  );
}

